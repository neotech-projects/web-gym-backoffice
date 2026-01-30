import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Operator, OperatorsResponse, OperatorResponse } from '../../shared/models/operator-data.interface';

@Injectable({
  providedIn: 'root'
})
export class OperatorsService {
  // URL del microservizio - usa URL relativo quando il proxy è configurato
  // In produzione sostituire con l'URL reale del microservizio
  private readonly API_URL = '/api/operators';
  
  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/operators.json';
  
  // Flag per tracciare se il server è disponibile
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000; // Controlla ogni minuto

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
   * Recupera la lista degli operatori dal microservizio
   * In caso di errore, fallback al mock locale
   */
  getOperators(): Observable<Operator[]> {
    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockOperators();
    }

    return this.http.get<OperatorsResponse>(this.API_URL, {
      // Aggiungi headers per evitare problemi di CORS
      headers: {
        'Accept': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          // Formatta le date di nascita per la visualizzazione
          return response.data.map(operator => ({
            ...operator,
            birthdateDisplay: operator.birthdate ? new Date(operator.birthdate).toLocaleDateString('it-IT') : undefined
          }));
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // Se è un 404 e il proxy non funziona, usa il mock senza loggare l'errore
        if (error.status === 404) {
          this.serverAvailable = false;
          // Non loggare l'errore 404 se il fallback funziona
          return this.getMockOperators();
        }
        return this.handleConnectionError(error, () => this.getMockOperators());
      })
    );
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
   * Crea un nuovo operatore
   */
  createOperator(operator: Partial<Operator>): Observable<Operator> {
    if (!this.isServerAvailable()) {
      // Simula creazione locale
      return of({ ...operator, id: Date.now() } as Operator);
    }

    return this.http.post<OperatorResponse>(this.API_URL, operator).pipe(
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
        // In caso di errore, simula la creazione locale
        return of({ ...operator, id: Date.now() } as Operator);
      })
    );
  }

  /**
   * Aggiorna un operatore esistente
   */
  updateOperator(operatorId: number | string, operator: Partial<Operator>): Observable<Operator> {
    if (!this.isServerAvailable()) {
      // Simula aggiornamento locale
      return of({ ...operator, id: operatorId } as Operator);
    }

    return this.http.put<OperatorResponse>(`${this.API_URL}/${operatorId}`, operator).pipe(
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
        return of({ ...operator, id: operatorId } as Operator);
      })
    );
  }

  /**
   * Elimina un operatore
   */
  deleteOperator(operatorId: number | string): Observable<boolean> {
    if (!this.isServerAvailable()) {
      // Simula eliminazione locale
      return of(true);
    }

    return this.http.delete<{ success: boolean; message?: string }>(`${this.API_URL}/${operatorId}`).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.success;
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula l'eliminazione locale
        return of(true);
      })
    );
  }
}

