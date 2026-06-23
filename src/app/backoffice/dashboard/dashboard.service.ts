import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DashboardStats, DashboardStatsBackendResponse, AccessoBackend, CurrentPresence } from '../../shared/models/dashboard-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
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

  apriPorta(): Observable<void> {
    return this.http.post<void>(`${this.DASHBOARD_BASE_URL}/apri-porta`, null);
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStatsBackendResponse>(this.API_URL).pipe(
      switchMap((response) =>
        this.getWeeklyBookingsCount().pipe(
          map((weeklyBookings) => ({
            weeklyBookings,
            monthlyPresences: 0,
            currentPresences: response.presenzeAttuali ?? 0,
            lastUpdate: new Date().toISOString()
          }))
        )
      ),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  private getWeeklyBookingsCount(): Observable<number> {
    return this.http.get<{ data?: string | number }[]>(this.PRENOTAZIONI_URL, { headers: { Accept: 'application/json' } }).pipe(
      map((list) => {
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
        return (list || []).filter((p) => {
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

  getCurrentPresences(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/presenze-attuali`).pipe(
      map((count) => count ?? 0),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  getCurrentPresencesList(): Observable<CurrentPresence[]> {
    return this.http.get<AccessoBackend[]>(`${this.API_URL}/lista-presenza-attuali`).pipe(
      map((list) => (list || []).map((a) => this.mapAccessoToCurrentPresence(a))),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  private mapAccessoToCurrentPresence(a: AccessoBackend): CurrentPresence {
    const dataOra = a.dataOraAccesso
      ? new Date(a.dataOraAccesso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      : '';
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
}
