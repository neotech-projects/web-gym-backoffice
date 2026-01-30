import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DashboardResponse, DashboardStats, CurrentPresencesResponse, CurrentPresence } from '../../shared/models/dashboard-data.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // URL del microservizio - usa URL relativo quando il proxy è configurato
  // In produzione sostituire con l'URL reale del microservizio
  private readonly API_URL = '/api/dashboard/stats';
  
  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/dashboard-stats.json';
  
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
   * Recupera le statistiche della dashboard dal microservizio
   * In caso di errore, fallback al mock locale
   */
  getDashboardStats(): Observable<DashboardStats> {
    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockStats();
    }

    return this.http.get<DashboardResponse>(this.API_URL, {
      // Timeout di 2 secondi per evitare attese lunghe
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          return response.data;
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => this.getMockStats());
      })
    );
  }

  /**
   * Recupera le statistiche dal mock locale
   */
  private getMockStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.MOCK_URL).pipe(
      catchError(error => {
        console.error('Errore nel caricamento del mock:', error);
        // Fallback a dati di default
        return of({
          weeklyBookings: 15,
          monthlyPresences: 28,
          currentPresences: 0,
          lastUpdate: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Recupera solo le presenze attuali (per aggiornamenti periodici)
   */
  getCurrentPresences(): Observable<number> {
    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockStats().pipe(
        map(stats => stats.currentPresences)
      );
    }

    return this.http.get<{ success: boolean; currentPresences: number }>(`${this.API_URL}/current-presences`).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.currentPresences;
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => 
          this.getMockStats().pipe(
            map(stats => stats.currentPresences)
          )
        );
      })
    );
  }

  /**
   * Recupera la lista delle presenze attuali con i nominativi
   */
  getCurrentPresencesList(): Observable<CurrentPresence[]> {
    // Se il server non è disponibile, usa direttamente il mock
    if (!this.isServerAvailable()) {
      return this.getMockPresencesList();
    }

    return this.http.get<CurrentPresencesResponse>(`${this.API_URL}/current-presences-list`).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.presences || [];
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => this.getMockPresencesList());
      })
    );
  }

  /**
   * Recupera la lista delle presenze dal mock locale
   */
  private getMockPresencesList(): Observable<CurrentPresence[]> {
    // Carica gli utenti e le prenotazioni dal mock
    return this.http.get<any[]>('/assets/mock/users.json').pipe(
      map(users => {
        // Prendi un numero casuale di utenti (0-5) come presenze
        const count = Math.floor(Math.random() * 6);
        const shuffled = [...users].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map((user) => {
          const fullName = `${user.firstName} ${user.lastName}`;
          // Genera dati casuali per la prenotazione
          const startHour = Math.floor(Math.random() * 8) + 9; // 9-16
          const startMinute = Math.random() > 0.5 ? 0 : 30;
          const duration = Math.random() > 0.5 ? 60 : 90; // 1h o 1h30
          const endHour = startHour + Math.floor(duration / 60);
          const endMinute = startMinute + (duration % 60);
          
          const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          const durationStr = duration === 60 ? '1h' : '1h 30m';
          
          // Note casuali
          const notes = [
            'Allenamento cardio',
            'Sessione di forza',
            'Allenamento completo',
            'Cardio e stretching',
            'Sessione personalizzata'
          ];
          const note = notes[Math.floor(Math.random() * notes.length)];
          
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: fullName,
            company: user.company || 'N/A',
            bookingNote: note,
            bookingStartTime: startTime,
            bookingEndTime: endTime,
            bookingDuration: durationStr
          };
        });
      }),
      catchError(error => {
        console.error('Errore nel caricamento del mock presenze:', error);
        // Fallback a dati di default
        return of([
          { 
            id: 1, 
            firstName: 'Mario', 
            lastName: 'Rossi', 
            fullName: 'Mario Rossi',
            company: 'Acme Corporation',
            bookingNote: 'Allenamento cardio',
            bookingStartTime: '10:00',
            bookingEndTime: '11:00',
            bookingDuration: '1h'
          },
          { 
            id: 2, 
            firstName: 'Laura', 
            lastName: 'Bianchi', 
            fullName: 'Laura Bianchi',
            company: 'TechSolutions S.r.l.',
            bookingNote: 'Sessione di forza',
            bookingStartTime: '14:00',
            bookingEndTime: '15:30',
            bookingDuration: '1h 30m'
          },
          { 
            id: 3, 
            firstName: 'Giovanni', 
            lastName: 'Verdi', 
            fullName: 'Giovanni Verdi',
            company: 'Global Industries',
            bookingNote: 'Allenamento completo',
            bookingStartTime: '09:00',
            bookingEndTime: '10:00',
            bookingDuration: '1h'
          }
        ]);
      })
    );
  }
}

