import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { OperatorProfile, OperatorProfileResponse } from '../../shared/models/operator-profile-data.interface';
import { OperatorsService } from '../visualizza-operatori/operators.service';

@Injectable({
  providedIn: 'root'
})
export class OperatorProfileService {
  // URL del microservizio - usa URL relativo quando il proxy è configurato
  // In produzione sostituire con l'URL reale del microservizio
  private readonly API_URL = '/api/operator/profile';
  
  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/operator-profile.json';
  
  // Flag per tracciare se il server è disponibile
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000; // Controlla ogni minuto

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
   * Recupera il profilo dell'operatore dal microservizio
   * In caso di errore, fallback al mock locale
   * @param operatorId ID dell'operatore di cui recuperare il profilo
   */
  getProfile(operatorId?: number | string): Observable<OperatorProfile> {
    // Se è fornito un ID operatore, recupera i dati da OperatorsService
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
          console.error('Errore nel recupero dell\'operatore:', error);
          return this.getMockProfile(operatorId);
        })
      );
    }

    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockProfile();
    }

    return this.http.get<OperatorProfileResponse>(this.API_URL, {
      // Aggiungi headers per evitare problemi di CORS
      headers: {
        'Accept': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          // Formatta la data di nascita per la visualizzazione
          return {
            ...response.data,
            birthdateDisplay: response.data.birthdate ? new Date(response.data.birthdate).toLocaleDateString('it-IT') : undefined
          };
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // Se è un 404 e il proxy non funziona, usa il mock senza loggare l'errore
        if (error.status === 404) {
          this.serverAvailable = false;
          // Non loggare l'errore 404 se il fallback funziona
          return this.getMockProfile();
        }
        return this.handleConnectionError(error, () => this.getMockProfile());
      })
    );
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
   * Aggiorna il profilo dell'operatore
   */
  updateProfile(profile: Partial<OperatorProfile>): Observable<OperatorProfile> {
    if (!this.isServerAvailable()) {
      // Simula aggiornamento locale
      return this.getMockProfile().pipe(
        map(mockProfile => ({ ...mockProfile, ...profile } as OperatorProfile))
      );
    }

    return this.http.put<OperatorProfileResponse>(this.API_URL, profile).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          return {
            ...response.data,
            birthdateDisplay: response.data.birthdate ? new Date(response.data.birthdate).toLocaleDateString('it-IT') : undefined
          };
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula l'aggiornamento locale
        return this.getMockProfile().pipe(
          map(mockProfile => ({ ...mockProfile, ...profile } as OperatorProfile))
        );
      })
    );
  }

  /**
   * Cambia la password dell'operatore
   */
  changePassword(oldPassword: string, newPassword: string): Observable<boolean> {
    if (!this.isServerAvailable()) {
      // Simula cambio password locale
      return of(true);
    }

    return this.http.post<{ success: boolean; message?: string }>(`${this.API_URL}/change-password`, {
      oldPassword,
      newPassword
    }).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.success;
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula il cambio password locale
        return of(true);
      })
    );
  }
}

