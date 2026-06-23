import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Booking, PrenotazioneBackend } from '../../shared/models/booking-data.interface';
import { UsersService } from '../gestisci-utenti/users.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/prenotazioni` : '/api/prenotazioni';
  }

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  private static readonly NOON_MS = 12 * 60 * 60 * 1000;

  private mapPrenotazioneToBooking(p: PrenotazioneBackend, userName?: string): Booking {
    let dataStr: string;
    if (p.data == null) {
      dataStr = new Date().toLocaleDateString('en-CA');
    } else if (typeof p.data === 'number') {
      dataStr = new Date(p.data + BookingsService.NOON_MS).toLocaleDateString('en-CA');
    } else {
      const dataPart = p.data.includes('T') ? p.data.split('T')[0] : p.data;
      dataStr = dataPart;
    }
    let startISO: string;
    let endISO: string;
    if (p.oraInizio != null) {
      let start: Date;
      if (typeof p.oraInizio === 'number') {
        start = new Date(p.oraInizio);
        dataStr = start.toLocaleDateString('en-CA');
      } else {
        const iso = String(p.oraInizio);
        const timePart = iso.includes('T') ? iso.split('T')[1]?.slice(0, 8) : iso.slice(0, 8);
        if (iso.includes('T')) {
          const fromOra = iso.split('T')[0];
          if (fromOra && fromOra.length >= 10 && !fromOra.startsWith('1970-01-01')) {
            dataStr = fromOra.slice(0, 10);
          }
        }
        start = new Date(`${dataStr}T${timePart || '09:00:00'}`);
      }
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const datePart = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      startISO = `${datePart(start)}T${pad2(start.getHours())}:${pad2(start.getMinutes())}:${pad2(start.getSeconds())}`;
      const durata = p.durataMinuti != null && p.durataMinuti > 0 ? p.durataMinuti : 60;
      const end = new Date(start.getTime() + durata * 60 * 1000);
      endISO = `${datePart(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:${pad2(end.getSeconds())}`;
    } else {
      startISO = `${dataStr}T09:00:00`;
      endISO = `${dataStr}T10:00:00`;
    }
    const id = p.id != null ? String(p.id) : '';
    return {
      id,
      user: userName ?? `Utente ${p.utenteId}`,
      start: startISO,
      end: endISO,
      title: 'Prenotazione',
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: { user: userName ?? `Utente ${p.utenteId}`, utenteId: p.utenteId }
    };
  }

  private mapBookingToPrenotazione(b: Booking): Partial<PrenotazioneBackend> {
    const utenteId = b.extendedProps?.utenteId;
    if (utenteId == null) {
      throw new Error('utenteId obbligatorio in extendedProps per creare la prenotazione');
    }
    const start = new Date(b.start);
    const end = new Date(b.end);
    const dataStr = b.start.split('T')[0];
    let durataMinuti = Math.round((end.getTime() - start.getTime()) / (60 * 1000));
    if (durataMinuti < 1) durataMinuti = 60;
    const offsetMin = -start.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const pad = (n: number) => Math.abs(n).toString().padStart(2, '0');
    const tz = sign + pad(Math.floor(Math.abs(offsetMin) / 60)) + ':' + pad(Math.abs(offsetMin) % 60);
    const oraInizioISO =
      `${dataStr}T${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}${tz}`;
    return {
      utenteId,
      data: dataStr,
      oraInizio: oraInizioISO,
      durataMinuti,
      stato: 'Confermata'
    };
  }

  private mapBookingsWithUsers(list: PrenotazioneBackend[], users?: { id: number | string; firstName: string; lastName: string }[]): { bookings: Booking[]; allBookings: Booking[] } {
    const userMap = new Map<number, string>();
    (users || []).forEach((u) => userMap.set(Number(u.id), `${u.firstName} ${u.lastName}`.trim()));
    const bookings = (list || []).map((p) => this.mapPrenotazioneToBooking(p, userMap.get(p.utenteId)));
    const allBookings = bookings.map((b) => ({
      ...b,
      user: b.user,
      extendedProps: { ...b.extendedProps, user: b.user }
    }));
    return { bookings, allBookings };
  }

  getBookings(): Observable<{ bookings: Booking[]; allBookings: Booking[] }> {
    return this.http.get<PrenotazioneBackend[]>(this.API_URL, { headers: { Accept: 'application/json' } }).pipe(
      switchMap((list) =>
        this.usersService.getUsers().pipe(
          map((users) => this.mapBookingsWithUsers(list, users)),
          catchError(() => of(this.mapBookingsWithUsers(list)))
        )
      ),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  getBookingsByDate(date: string): Observable<Booking[]> {
    const url = `${this.API_URL}/data/${date}`;
    return this.http.get<PrenotazioneBackend[]>(url, { headers: { Accept: 'application/json' } }).pipe(
      switchMap((list) =>
        this.usersService.getUsers().pipe(
          map((users) => {
            const userMap = new Map<number, string>();
            users.forEach((u) => userMap.set(Number(u.id), `${u.firstName} ${u.lastName}`.trim()));
            return (list || []).map((p) => this.mapPrenotazioneToBooking(p, userMap.get(p.utenteId)));
          }),
          catchError(() => of((list || []).map((p) => this.mapPrenotazioneToBooking(p, undefined))))
        )
      ),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  createBooking(booking: Booking): Observable<{ success: boolean; data: Booking; message?: string }> {
    const body = this.mapBookingToPrenotazione(booking);
    return this.http.post<PrenotazioneBackend>(this.API_URL, body).pipe(
      map((created) => {
        const userName = booking.extendedProps?.user ?? booking.user;
        const b = this.mapPrenotazioneToBooking(created, userName ?? undefined);
        return { success: true, data: b, message: 'Prenotazione creata' };
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  deleteBooking(bookingId: string): Observable<{ success: boolean; message?: string }> {
    const id = parseInt(bookingId, 10);
    if (isNaN(id)) {
      return throwError(() => new Error('ID prenotazione non valido'));
    }

    return this.http.delete<void>(`${this.API_URL}/${id}`, { observe: 'response' }).pipe(
      map((res) => ({
        success: res.status >= 200 && res.status < 300,
        message: 'Prenotazione eliminata'
      })),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
