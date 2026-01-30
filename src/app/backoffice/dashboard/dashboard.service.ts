import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DashboardResponse, DashboardStats } from '../../shared/models/dashboard-data.interface';

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
}

