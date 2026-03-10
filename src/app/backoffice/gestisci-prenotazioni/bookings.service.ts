import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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

  private readonly MOCK_URL = '/assets/mock/bookings.json';
  private serverAvailable = true;
  private lastCheck = 0;
  private readonly CHECK_INTERVAL = 60000;

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  private isServerAvailable(): boolean {
    const now = Date.now();
    if (now - this.lastCheck > this.CHECK_INTERVAL) {
      this.lastCheck = now;
    }
    return this.serverAvailable;
  }

  private handleConnectionError<T>(error: HttpErrorResponse, useMock: () => Observable<T>): Observable<T> {
    const isConnectionError = error.status === 0;
    const isParseError = error.message?.includes('parsing') || error.error instanceof ProgressEvent;
    if (isConnectionError || isParseError) {
      this.serverAvailable = false;
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio prenotazioni non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    if (error.status != null && error.status >= 400) {
      this.serverAvailable = false;
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio prenotazioni non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    console.warn('Errore nella chiamata al microservizio prenotazioni:', error.message);
    this.serverAvailable = false;
    return useMock();
  }

  /** Da PrenotazioneBackend (data, oraInizio, durataMinuti) a start/end ISO e Booking.
   * Se durataMinuti è 0 o mancante, usa 60.
   * Per data (timestamp): +12h per evitare che mezzanotte UTC diventi il giorno prima in locale.
   * Per data (stringa) con oraInizio "1970-01-01T...": il backend può aver serializzato la data in UTC (+1 giorno in locale). */
  private static readonly NOON_MS = 12 * 60 * 60 * 1000;

  private mapPrenotazioneToBooking(p: PrenotazioneBackend, userName?: string): Booking {
    let dataStr: string;
    if (p.data == null) {
      dataStr = new Date().toLocaleDateString('en-CA');
    } else if (typeof p.data === 'number') {
      dataStr = new Date(p.data + BookingsService.NOON_MS).toLocaleDateString('en-CA');
    } else {
      const dataPart = p.data.includes('T') ? p.data.split('T')[0] : p.data;
      const oraStr = p.oraInizio != null ? String(p.oraInizio) : '';
      if (oraStr.startsWith('1970-01-01') && /^\d{4}-\d{2}-\d{2}$/.test(dataPart)) {
        const d = new Date(dataPart + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        dataStr = d.toLocaleDateString('en-CA');
      } else {
        dataStr = dataPart;
      }
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
      startISO = `${dataStr}T${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}:${String(start.getSeconds()).padStart(2, '0')}`;
      const durata = (p.durataMinuti != null && p.durataMinuti > 0) ? p.durataMinuti : 60;
      const end = new Date(start.getTime() + durata * 60 * 1000);
      endISO = `${dataStr}T${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:${String(end.getSeconds()).padStart(2, '0')}`;
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

  /** Da Booking (start, end, extendedProps.utenteId) a body POST PrenotazioneBackend.
   * Durata minima 1 minuto. oraInizio inviata con timezone locale così il server non converte e salva l'ora sbagliata. */
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

  /**
   * Recupera tutte le prenotazioni (GET /api/prenotazioni).
   * Prova sempre l'API così il calendario mostra i dati dal DB; getUsers() in errore non blocca.
   */
  getBookings(): Observable<{ bookings: Booking[]; allBookings: Booking[] }> {
    return this.http.get<PrenotazioneBackend[]>(this.API_URL, { headers: { Accept: 'application/json' } }).pipe(
      switchMap(list => {
        this.serverAvailable = true;
        return this.usersService.getUsers().pipe(
          map(users => {
            const userMap = new Map<number, string>();
            users.forEach(u => userMap.set(Number(u.id), `${u.firstName} ${u.lastName}`.trim()));
            const bookings = (list || []).map(p =>
              this.mapPrenotazioneToBooking(p, userMap.get(p.utenteId))
            );
            const allBookings = bookings.map(b => ({
              ...b,
              user: b.user,
              extendedProps: { ...b.extendedProps, user: b.user }
            }));
            return { bookings, allBookings };
          }),
          catchError(() => {
            const bookings = (list || []).map(p => this.mapPrenotazioneToBooking(p, undefined));
            const allBookings = bookings.map(b => ({ ...b, user: b.user, extendedProps: { ...b.extendedProps, user: b.user } }));
            return of({ bookings, allBookings });
          })
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('GET prenotazioni fallito, calendario vuoto. Controlla che il backend sia avviato e CORS/URL corretti.', error?.status, error?.message);
        this.serverAvailable = false;
        return of({ bookings: [], allBookings: [] });
      })
    );
  }

  /**
   * Recupera le prenotazioni per una data (GET /api/prenotazioni/data/{date}).
   * Formato date: yyyy-MM-dd.
   * Prova sempre l'API per la data cliccata; getUsers() in errore non blocca (mostriamo "Utente id").
   */
  getBookingsByDate(date: string): Observable<Booking[]> {
    const url = `${this.API_URL}/data/${date}`;
    return this.http.get<PrenotazioneBackend[]>(url, { headers: { Accept: 'application/json' } }).pipe(
      switchMap(list => {
        this.serverAvailable = true;
        return this.usersService.getUsers().pipe(
          map(users => {
            const userMap = new Map<number, string>();
            users.forEach(u => userMap.set(Number(u.id), `${u.firstName} ${u.lastName}`.trim()));
            return (list || []).map(p => this.mapPrenotazioneToBooking(p, userMap.get(p.utenteId)));
          }),
          catchError(() => of((list || []).map(p => this.mapPrenotazioneToBooking(p, undefined))))
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('GET prenotazioni per data fallito.', error?.status, error?.message);
        this.serverAvailable = false;
        return of([]);
      })
    );
  }

  private getMockBookings(): Observable<{ bookings: Booking[]; allBookings: Booking[] }> {
    return this.http.get<{ bookings: Booking[]; allBookings: Booking[] }>(this.MOCK_URL).pipe(
      map(data => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        const formatDateISO = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dateMap: Record<string, string> = {
          '2025-12-18': formatDateISO(tomorrow),
          '2025-12-19': formatDateISO(dayAfter),
          '2025-12-20': formatDateISO(new Date(dayAfter.getTime() + 86400000))
        };
        const updateDates = (arr: Booking[]) =>
          arr.map((booking: Booking) => {
            if (!booking.start) return booking;
            const orig = booking.start.split('T')[0];
            const newDate = dateMap[orig] ?? orig;
            const time = booking.start.split('T')[1];
            return {
              ...booking,
              start: `${newDate}T${time}`,
              end: booking.end ? `${newDate}T${(booking.end as string).split('T')[1]}` : booking.end
            };
          });
        return {
          bookings: updateDates(data.bookings || []),
          allBookings: updateDates(data.allBookings || [])
        };
      }),
      catchError(() => of({ bookings: [], allBookings: [] }))
    );
  }

  /**
   * Crea una prenotazione (POST /api/prenotazioni).
   * booking deve avere extendedProps.utenteId (number).
   */
  createBooking(booking: Booking): Observable<{ success: boolean; data: Booking; message?: string }> {
    const body = this.mapBookingToPrenotazione(booking);
    if (!this.isServerAvailable()) {
      return of({
        success: true,
        data: { ...booking, id: String(Date.now()) },
        message: 'Prenotazione creata (mock locale)'
      });
    }

    return this.http.post<PrenotazioneBackend>(this.API_URL, body).pipe(
      map(created => {
        this.serverAvailable = true;
        const userName = booking.extendedProps?.user ?? booking.user;
        const b = this.mapPrenotazioneToBooking(created, userName ?? undefined);
        return { success: true, data: b, message: 'Prenotazione creata' };
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400) throw error;
        return this.handleConnectionError(error, () =>
          of({
            success: true,
            data: { ...booking, id: String(Date.now()) },
            message: 'Prenotazione creata (fallback mock)'
          })
        );
      })
    );
  }

  /**
   * Elimina una prenotazione (DELETE /api/prenotazioni/{id}).
   */
  deleteBooking(bookingId: string): Observable<{ success: boolean; message?: string }> {
    const id = parseInt(bookingId, 10);
    if (isNaN(id)) {
      return of({ success: true, message: 'ID non valido' });
    }
    if (!this.isServerAvailable()) {
      return of({ success: true, message: 'Prenotazione eliminata (mock locale)' });
    }

    return this.http.delete<void>(`${this.API_URL}/${id}`, { observe: 'response' }).pipe(
      map(res => {
        this.serverAvailable = true;
        return { success: res.status >= 200 && res.status < 300, message: 'Prenotazione eliminata' };
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) throw error;
        return this.handleConnectionError(error, () => of({ success: true, message: 'Eliminata (fallback)' }));
      })
    );
  }
}
