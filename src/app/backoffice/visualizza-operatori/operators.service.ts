import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Operator, UtenteBackend } from '../../shared/models/operator-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperatorsService {
  // Come dashboard: environment.apiUrl + path (/api/operatori)
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/operatori` : '/api/operatori';
  }

  private readonly MOCK_URL = '/assets/mock/operators.json';
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000;

  constructor(private http: HttpClient) {}

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
   * Recupera la lista degli operatori da ms-gym-backoffice (GET /api/operatori).
   * Il backend restituisce List<Utente> = array senza wrapper.
   */
  getOperators(): Observable<Operator[]> {
    if (!this.isServerAvailable()) {
      return this.getMockOperators();
    }

    return this.http.get<UtenteBackend[]>(this.API_URL, {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      map(list => {
        this.serverAvailable = true;
        return (list || []).map(u => this.mapUtenteToOperator(u));
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.serverAvailable = false;
          return this.getMockOperators();
        }
        return this.handleConnectionError(error, () => this.getMockOperators());
      })
    );
  }

  /** Mappa il DTO Utente del backend nel modello Operator usato dalla UI */
  private mapUtenteToOperator(u: UtenteBackend): Operator {
    const birthdate = u.dataNascita ? (typeof u.dataNascita === 'string' ? u.dataNascita : (u.dataNascita as any)) : '';
    return {
      id: u.id ?? 0,
      firstName: u.nome ?? '',
      lastName: u.cognome ?? '',
      email: u.email ?? '',
      phone: u.telefono ?? '',
      birthdate,
      birthdateDisplay: birthdate ? new Date(birthdate).toLocaleDateString('it-IT') : undefined,
      gender: u.sesso ?? '',
      role: u.tipoUtente ?? 'OPERATORE',
      status: u.stato ?? '',
      registrationDate: u.creato,
      societaId: u.societaId,
      societaNome: u.societaNome,
      matricola: u.matricola
    };
  }

  /** Mappa Operator (UI) in UtenteBackend per POST/PUT */
  private mapOperatorToUtente(o: Partial<Operator>): UtenteBackend {
    return {
      id: typeof o.id === 'number' ? o.id : undefined,
      nome: o.firstName ?? '',
      cognome: o.lastName ?? '',
      email: o.email ?? '',
      telefono: o.phone ?? undefined,
      dataNascita: o.birthdate || undefined,
      sesso: o.gender || undefined,
      stato: o.status || undefined,
      societaId: o.societaId,
      matricola: o.matricola,
      password: o.password
    };
  }

  /**
   * Recupera gli operatori dal mock locale
   */
  private getMockOperators(): Observable<Operator[]> {
    return this.http.get<Operator[]>(this.MOCK_URL).pipe(
      map(operators => {
        // Formatta le date di nascita per la visualizzazione
        return operators.map(operator => ({
          ...operator,
          birthdateDisplay: operator.birthdate ? new Date(operator.birthdate).toLocaleDateString('it-IT') : undefined
        }));
      }),
      catchError(error => {
        console.error('Errore nel caricamento del mock:', error);
        // Fallback a dati di default
        return of([]);
      })
    );
  }

  /**
   * Crea un nuovo operatore (POST /api/operatori). Body in formato Utente; risposta Utente.
   */
  createOperator(operator: Partial<Operator>): Observable<Operator> {
    if (!this.isServerAvailable()) {
      return of({ ...operator, id: Date.now() } as Operator);
    }

    const body = this.mapOperatorToUtente(operator);
    return this.http.post<UtenteBackend>(this.API_URL, body).pipe(
      map(created => {
        this.serverAvailable = true;
        return this.mapUtenteToOperator(created);
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () =>
          of({ ...operator, id: Date.now() } as Operator)
        );
      })
    );
  }

  /**
   * Aggiorna un operatore (PUT /api/operatori/{id}). Body in formato Utente; risposta Utente.
   */
  updateOperator(operatorId: number | string, operator: Partial<Operator>): Observable<Operator> {
    if (!this.isServerAvailable()) {
      return of({ ...operator, id: operatorId } as Operator);
    }

    const body = this.mapOperatorToUtente(operator);
    return this.http.put<UtenteBackend>(`${this.API_URL}/${operatorId}`, body).pipe(
      map(updated => {
        this.serverAvailable = true;
        return this.mapUtenteToOperator(updated);
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () =>
          of({ ...operator, id: operatorId } as Operator)
        );
      })
    );
  }

  /**
   * Elimina un operatore (DELETE /api/operatori/{id}). Backend restituisce 204 No Content.
   */
  deleteOperator(operatorId: number | string): Observable<boolean> {
    if (!this.isServerAvailable()) {
      return of(true);
    }

    return this.http.delete<void>(`${this.API_URL}/${operatorId}`, { observe: 'response' }).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.status >= 200 && response.status < 300;
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => of(true));
      })
    );
  }
}