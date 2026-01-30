import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, UsersResponse, UserResponse } from '../../shared/models/user-data.interface';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  // URL del microservizio - usa URL relativo quando il proxy è configurato
  // In produzione sostituire con l'URL reale del microservizio
  private readonly API_URL = '/api/users';
  
  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/users.json';
  
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
   * Normalizza un utente: migra certificatoMedico → dichiarazioneManleva per retrocompatibilità.
   */
  private normalizeUser(user: any): User {
    const { certificatoMedico, ...rest } = user;
    return {
      ...rest,
      dichiarazioneManleva: user.dichiarazioneManleva ?? certificatoMedico,
      birthdateDisplay: user.birthdate ? new Date(user.birthdate).toLocaleDateString('it-IT') : user.birthdateDisplay
    } as User;
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
   * Recupera la lista degli utenti dal microservizio
   * In caso di errore, fallback al mock locale
   */
  getUsers(): Observable<User[]> {
    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockUsers();
    }

    return this.http.get<UsersResponse>(this.API_URL, {
      // Aggiungi headers per evitare problemi di CORS
      headers: {
        'Accept': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          return response.data.map(user => this.normalizeUser(user));
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // Se è un 404 e il proxy non funziona, usa il mock senza loggare l'errore
        if (error.status === 404) {
          this.serverAvailable = false;
          // Non loggare l'errore 404 se il fallback funziona
          return this.getMockUsers();
        }
        return this.handleConnectionError(error, () => this.getMockUsers());
      })
    );
  }

  /**
   * Recupera gli utenti dal mock locale
   */
  private getMockUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.MOCK_URL).pipe(
      map(users => users.map(user => this.normalizeUser(user))),
      catchError(error => {
        console.error('Errore nel caricamento del mock:', error);
        // Fallback a dati di default
        return of([]);
      })
    );
  }

  /**
   * Crea un nuovo utente
   */
  createUser(user: User): Observable<User> {
    if (!this.isServerAvailable()) {
      // Simula creazione locale
      return of({ ...user, id: Date.now() });
    }

    return this.http.post<UserResponse>(this.API_URL, user).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          return this.normalizeUser(response.data);
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula la creazione locale
        return of({ ...user, id: Date.now() });
      })
    );
  }

  /**
   * Aggiorna un utente esistente
   */
  updateUser(userId: number | string, user: Partial<User>): Observable<User> {
    if (!this.isServerAvailable()) {
      // Simula aggiornamento locale
      return of({ ...user, id: userId } as User);
    }

    return this.http.put<UserResponse>(`${this.API_URL}/${userId}`, user).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          return this.normalizeUser(response.data);
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula l'aggiornamento locale
        return of({ ...user, id: userId } as User);
      })
    );
  }

  /**
   * Elimina un utente
   */
  deleteUser(userId: number | string): Observable<boolean> {
    if (!this.isServerAvailable()) {
      // Simula eliminazione locale
      return of(true);
    }

    return this.http.delete<{ success: boolean; message?: string }>(`${this.API_URL}/${userId}`).pipe(
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

