import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OperatorProfile } from '../../shared/models/operator-profile-data.interface';
import { UtenteBackend } from '../../shared/models/operator-data.interface';
import { OperatorsService } from '../visualizza-operatori/operators.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperatorProfileService {
  /** Stesso prefisso degli operatori: {@code /api/utenti} + {@code staff=true} (profilo/cambio password). */
  private get utentiApiBase(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/utenti` : '/api/utenti';
  }

  private readonly staffParams = new HttpParams().set('staff', 'true');

  private readonly MOCK_URL = '/assets/mock/operator-profile.json';
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000;

  constructor(
    private http: HttpClient,
    private operatorsService: OperatorsService
  ) {}

  /**
   * Verifica se il server è disponibile (con cache per evitare troppe chiamate)
   */
  private isServerAvailable(): boolean {
    const now = Date.now();
    // Se è passato più di CHECK_INTERVAL, aggiorna lo stato
    if (now - this.lastCheck > this.CHECK_INTERVAL) {
      this.lastCheck = now;
    }
    return this.serverAvailable;
  }

  /**
   * Gestisce gli errori di connessione in modo silenzioso quando il fallback funziona
   */
  private handleConnectionError<T>(error: HttpErrorResponse, useMock: () => Observable<T>): Observable<T> {
    // Se è un errore di connessione (status 0) o di parsing (risposta non JSON)
    const isConnectionError = error.status === 0;
    const isParseError = error.message?.includes('parsing') || error.error instanceof ProgressEvent;
    
    if (isConnectionError || isParseError) {
      this.serverAvailable = false;
      // Log solo un messaggio informativo, non l'intero errore
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per altri errori HTTP (404, 500, ecc.), logga normalmente ma usa comunque il mock
    if (error.status && error.status >= 400) {
      this.serverAvailable = false;
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per errori sconosciuti, logga e usa il mock
    console.warn('Errore nella chiamata al microservizio:', error.message);
    this.serverAvailable = false;
    return useMock();
  }

  /**
   * Recupera il profilo dell'operatore.
   * GET /api/utenti?staff=true&profilo=true&utenteId=X — non usare /profilo (nginx può dare 405 su GET; Allow mostra solo PUT, DELETE).
   * Senza operatorId: fallback su getOperators().find().
   */
  getProfile(operatorId?: number | string): Observable<OperatorProfile> {
    if (operatorId) {
      if (!this.isServerAvailable()) {
        return this.getMockProfile(operatorId);
      }
      const params = this.staffParams.set('utenteId', String(operatorId)).set('profilo', 'true');
      return this.http.get<UtenteBackend | UtenteBackend[]>(this.utentiApiBase, { params }).pipe(
        map(raw => {
          const u = this.extractUtenteFromProfiloResponse(raw, operatorId);
          this.serverAvailable = true;
          return this.mapUtenteToProfile(u);
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404 || error.status === 403 || error.status === 405) {
            this.serverAvailable = false;
            return this.getMockProfile(operatorId);
          }
          return this.handleConnectionError(error, () => this.getMockProfile(operatorId));
        })
      );
    }

    // Senza ID: fallback da lista operatori (comportamento legacy)
    return this.operatorsService.getOperators().pipe(
      map(operators => {
        if (operators.length === 0) throw new Error('Nessun operatore trovato');
        const op = operators[0];
        return {
          id: op.id,
          firstName: op.firstName,
          lastName: op.lastName,
          email: op.email,
          phone: op.phone,
          birthdate: op.birthdate,
          birthdateDisplay: op.birthdateDisplay,
          gender: op.gender,
          role: op.role ?? 'Operatore'
        };
      }),
      catchError(() => this.getMockProfile())
    );
  }

  /**
   * Se manca param profilo in query, il backend risponde con la lista: array invece di un solo utente.
   */
  private extractUtenteFromProfiloResponse(
    raw: UtenteBackend | UtenteBackend[],
    operatorId: number | string
  ): UtenteBackend {
    if (Array.isArray(raw)) {
      const found = raw.find(x => x != null && String(x.id) === String(operatorId));
      if (!found) {
        throw new Error('Profilo non trovato nella lista');
      }
      return found;
    }
    return raw;
  }

  /** Jackson può inviare la data come stringa ISO o come timestamp (numero). */
  private normalizeDataNascita(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    return '';
  }

  private mapUtenteToProfile(u: UtenteBackend): OperatorProfile {
    const birthdate = this.normalizeDataNascita(u.dataNascita as unknown);
    return {
      id: u.id ?? 0,
      firstName: u.nome ?? '',
      lastName: u.cognome ?? '',
      email: u.email ?? '',
      phone: u.telefono ?? '',
      birthdate,
      birthdateDisplay: birthdate ? new Date(birthdate).toLocaleDateString('it-IT') : undefined,
      gender: u.sesso ?? '',
      role: u.tipoUtente ?? 'OPERATORE'
    };
  }

  /**
   * Recupera il profilo dal mock locale
   * @param operatorId ID dell'operatore di cui recuperare il profilo (opzionale)
   */
  private getMockProfile(operatorId?: number | string): Observable<OperatorProfile> {
    // Se è fornito un ID, cerca nei dati mock degli operatori
    if (operatorId) {
      return this.operatorsService.getOperators().pipe(
        map(operators => {
          const operator = operators.find(op => op.id.toString() === operatorId.toString());
          if (!operator) {
            throw new Error('Operatore non trovato');
          }
          // Converte Operator in OperatorProfile
          const profile: OperatorProfile = {
            id: operator.id,
            firstName: operator.firstName,
            lastName: operator.lastName,
            email: operator.email,
            phone: operator.phone,
            birthdate: operator.birthdate,
            birthdateDisplay: operator.birthdateDisplay,
            gender: operator.gender,
            role: operator.role
          };
          return profile;
        }),
        catchError(error => {
          console.error('Errore nel caricamento del mock:', error);
          // Fallback a dati di default
          return of({
            id: 1,
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@email.com',
            phone: '+39 333 123 4567',
            birthdate: '1990-05-15',
            gender: 'Maschio',
            role: 'Operatore'
          });
        })
      );
    }

    // Fallback al file JSON statico se non è fornito un ID
    return this.http.get<OperatorProfile>(this.MOCK_URL).pipe(
      map(profile => {
        // Formatta la data di nascita per la visualizzazione
        return {
          ...profile,
          birthdateDisplay: profile.birthdate ? new Date(profile.birthdate).toLocaleDateString('it-IT') : undefined
        };
      }),
      catchError(error => {
        console.error('Errore nel caricamento del mock:', error);
        // Fallback a dati di default
        return of({
          id: 1,
          firstName: 'Mario',
          lastName: 'Rossi',
          email: 'mario.rossi@email.com',
          phone: '+39 333 123 4567',
          birthdate: '1990-05-15',
          gender: 'Maschio',
          role: 'Operatore'
        });
      })
    );
  }

  /**
   * Aggiorna il profilo (solo email e telefono).
   * PUT /api/utenti?staff=true&profilo=true&utenteId=X, body ModificaProfiloRequest.
   * profile.id è obbligatorio per utenteId.
   */
  updateProfile(profile: Partial<OperatorProfile>): Observable<OperatorProfile> {
    const utenteId = profile?.id;
    if (utenteId == null) {
      return this.getMockProfile().pipe(
        map(mock => ({ ...mock, ...profile } as OperatorProfile))
      );
    }

    if (!this.isServerAvailable()) {
      return this.getMockProfile(utenteId).pipe(
        map(mock => ({ ...mock, ...profile } as OperatorProfile))
      );
    }

    const body = { email: profile.email, telefono: profile.phone };
    const params = this.staffParams.set('utenteId', String(utenteId)).set('profilo', 'true');
    return this.http.put<UtenteBackend>(this.utentiApiBase, body, { params }).pipe(
      map(updated => {
        this.serverAvailable = true;
        return this.mapUtenteToProfile(updated);
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () =>
          this.getMockProfile(utenteId).pipe(
            map(mock => ({ ...mock, ...profile } as OperatorProfile))
          )
        );
      })
    );
  }

  /**
   * Cambia la password dell'operatore.
   * POST /api/utenti?staff=true&cambioPwd=true&utenteId=X (stessa URL del gateway del POST utenti; {@code cambioPwd} evita 400/404 rispetto a {@code cambioPassword} o path /profilo/...).
   */
  changePassword(operatorId: number | string, oldPassword: string, newPassword: string): Observable<boolean> {
    const body = { vecchiaPassword: oldPassword, nuovaPassword: newPassword };
    const params = this.staffParams.set('utenteId', String(operatorId)).set('cambioPwd', 'true');
    return this.http.post<void>(this.utentiApiBase, body, { params, observe: 'response' }).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.status >= 200 && response.status < 300;
      }),
      catchError((error: HttpErrorResponse) => {
        this.serverAvailable = error.status == null || error.status === 0;
        return throwError(() => error);
      })
    );
  }
}

