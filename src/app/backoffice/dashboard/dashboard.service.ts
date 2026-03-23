import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DashboardStats, DashboardStatsBackendResponse, AccessoBackend, CurrentPresence } from '../../shared/models/dashboard-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class DashboardService {
  // Base API: environment.apiUrl + path /api/dashboard/stats 
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/dashboard/stats` : '/api/dashboard/stats';
  }

  private get PRENOTAZIONI_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/prenotazioni` : '/api/prenotazioni';
  }

  private get DASHBOARD_BASE_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/dashboard` : '/api/dashboard';
  }

  constructor(private http: HttpClient) {}
  

  

  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/dashboard-stats.json';
  
  // Flag per tracciare se il server è disponibile
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000; // Controlla ogni minuto

 

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
   * Chiama il backend per aprire la porta 
   */
  apriPorta(): Observable<void> {
    return this.http.post<void>(`${this.DASHBOARD_BASE_URL}/apri-porta`, null);
  }

  /**
   * Il backend restituisce { presenzeAttuali, listaPresenzaAttuali }; le prenotazioni settimanali
   * si ricavano da GET /api/prenotazioni contando quelle nella settimana corrente (lun-dom).
   */
  getDashboardStats(): Observable<DashboardStats> {
    if (!this.isServerAvailable()) {
      return this.getMockStats();
    }

    return this.http.get<DashboardStatsBackendResponse>(this.API_URL).pipe(
      switchMap(response => {
        this.serverAvailable = true;
        return this.getWeeklyBookingsCount().pipe(
          map(weeklyBookings => ({
            weeklyBookings,
            monthlyPresences: 0,
            currentPresences: response.presenzeAttuali ?? 0,
            lastUpdate: new Date().toISOString()
          }))
        );
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => this.getMockStats());
      })
    );
  }

  /** Conta le prenotazioni la cui data ricade nella settimana corrente (lunedì–domenica). */
  private getWeeklyBookingsCount(): Observable<number> {
    return this.http.get<{ data?: string | number }[]>(this.PRENOTAZIONI_URL, { headers: { Accept: 'application/json' } }).pipe(
      map(list => {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const weekStart = monday.getTime();
        const weekEnd = sunday.getTime();
        return (list || []).filter(p => {
          let dateMs: number;
          if (p.data == null) return false;
          if (typeof p.data === 'number') dateMs = p.data;
          else {
            const str = typeof p.data === 'string' && p.data.length >= 10 ? p.data.slice(0, 10) : '';
            if (!str) return false;
            dateMs = new Date(str + 'T12:00:00').getTime();
          }
          return dateMs >= weekStart && dateMs <= weekEnd;
        }).length;
      }),
      catchError(() => of(0))
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
   * Recupera solo le presenze attuali /stats/presenze-attuali)
   */
  getCurrentPresences(): Observable<number> {
    if (!this.isServerAvailable()) {
      return this.getMockStats().pipe(
        map(stats => stats.currentPresences)
      );
    }

    return this.http.get<number>(`${this.API_URL}/presenze-attuali`).pipe(
      map(count => {
        this.serverAvailable = true;
        return count ?? 0;
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
   * Recupera la lista delle presenze attuali (endpoint ms-gym-backoffice: /stats/lista-presenza-attuali).
   * Il backend restituisce Accesso[]; mappiamo in CurrentPresence[] per la UI.
   */
  getCurrentPresencesList(): Observable<CurrentPresence[]> {
    if (!this.isServerAvailable()) {
      return this.getMockPresencesList();
    }

    return this.http.get<AccessoBackend[]>(`${this.API_URL}/lista-presenza-attuali`).pipe(
      map(list => {
        this.serverAvailable = true;
        return (list || []).map(a => this.mapAccessoToCurrentPresence(a));
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => this.getMockPresencesList());
      })
    );
  }

  /** Mappa il DTO Accesso del backend nel modello CurrentPresence usato dalla UI */
  private mapAccessoToCurrentPresence(a: AccessoBackend): CurrentPresence {
    const dataOra = a.dataOraAccesso ? new Date(a.dataOraAccesso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    return {
      id: a.id,
      firstName: '',
      lastName: '',
      fullName: `Utente ${a.utenteId}`,
      company: undefined,
      bookingNote: a.esito || undefined,
      bookingStartTime: dataOra,
      bookingEndTime: undefined,
      bookingDuration: undefined
    };
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

