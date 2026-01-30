import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BookingsResponse, Booking } from '../../shared/models/booking-data.interface';

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  // URL del microservizio - usa URL relativo quando il proxy è configurato
  // In produzione sostituire con l'URL reale del microservizio
  private readonly API_URL = '/api/bookings';
  
  // URL per il mock locale (usato quando il microservizio non è disponibile)
  private readonly MOCK_URL = '/assets/mock/bookings.json';
  
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
        console.info('Microservizio prenotazioni non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per altri errori HTTP (404, 500, ecc.), logga normalmente ma usa comunque il mock
    if (error.status && error.status >= 400) {
      this.serverAvailable = false;
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio prenotazioni non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per errori sconosciuti, logga e usa il mock
    console.warn('Errore nella chiamata al microservizio prenotazioni:', error.message);
    this.serverAvailable = false;
    return useMock();
  }

  /**
   * Recupera le prenotazioni base per il calendario (solo dati essenziali)
   * In caso di errore, fallback al mock locale
   */
  getBookings(): Observable<{ bookings: Booking[]; allBookings: Booking[] }> {
    return this.http.get<BookingsResponse>(this.API_URL).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          // Il server restituisce SOLO bookings (dati generici), senza allBookings
          const bookings = response.data.bookings || [];
          // Crea allBookings localmente per il calcolo della disponibilità (senza dettagli utente)
          const allBookings = bookings.map(b => ({
            id: b.id,
            user: 'Utente',
            start: b.start,
            end: b.end
          }));
          return {
            bookings: bookings,
            allBookings: allBookings
          };
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        // Fallback: usa mock locale ma restituisci solo bookings (senza allBookings dal JSON)
        return this.getMockBookings().pipe(
          map(data => {
            // Restituisci solo bookings (dati generici), crea allBookings localmente
            const bookings = data.bookings || [];
            const allBookings = bookings.map(b => ({
              id: b.id,
              user: 'Utente',
              start: b.start,
              end: b.end
            }));
            return {
              bookings: bookings,
              allBookings: allBookings
            };
          })
        );
      })
    );
  }

  /**
   * Recupera i dettagli delle prenotazioni per un giorno specifico
   * Usato quando si clicca su uno slot del calendario
   */
  getBookingsByDate(date: string): Observable<Booking[]> {
    // SEMPRE prova prima a chiamare il server, anche se prima c'è stato un errore
    // Il server potrebbe essere disponibile ora
    
    // Se il server non è disponibile, filtra dal mock locale e combina i dati
    // Ma solo come ultima risorsa
    const useMockFallback = () => {
      return this.getMockBookings().pipe(
        map(data => {
          // Filtra le prenotazioni base per la data
          const baseBookings = data.bookings.filter(booking => {
            const bookingDate = booking.start.split('T')[0];
            return bookingDate === date;
          });
          
          // Filtra anche allBookings per ottenere i dettagli completi (utente, ecc.)
          const detailedBookings = data.allBookings.filter(booking => {
            const bookingDate = booking.start.split('T')[0];
            return bookingDate === date;
          });
          
          // Combina i dati: usa i dettagli da allBookings per arricchire le prenotazioni base
          const combined = baseBookings.map(baseBooking => {
            const detailed = detailedBookings.find(d => d.id === baseBooking.id);
            if (detailed) {
              // Combina i dati: mantieni le proprietà base e aggiungi i dettagli
              return {
                ...baseBooking,
                user: detailed.user,
                extendedProps: {
                  ...baseBooking.extendedProps,
                  user: detailed.user
                }
              };
            }
            return baseBooking;
          });
          
          // Filtro finale per sicurezza: assicurati che tutte le prenotazioni siano del giorno richiesto
          const finalFiltered = combined.filter(booking => {
            if (!booking.start) return false;
            const bookingDate = booking.start.split('T')[0];
            return bookingDate === date;
          });
          
          // Verifica finale: assicurati che tutte le prenotazioni siano del giorno richiesto
          const verified = finalFiltered.filter(booking => {
            if (!booking.start) {
              return false;
            }
            const bookingDate = booking.start.split('T')[0];
            return bookingDate === date;
          });
          
          // IMPORTANTE: Restituisci SOLO le prenotazioni verificate, non l'intero JSON
          return verified;
        })
      );
    };
    
    // SEMPRE prova a chiamare il server prima, anche se isServerAvailable() dice false
    // perché potrebbe essere disponibile ora
    const endpointUrl = `${this.API_URL}/date/${date}`;
    return this.http.get<{ success: boolean; data: Booking[]; message?: string }>(endpointUrl).pipe(
      map(response => {
        if (response.success && response.data) {
          this.serverAvailable = true;
          
          // Filtro aggiuntivo per sicurezza
          const filtered = response.data.filter(booking => {
            if (!booking.start) return false;
            const bookingDate = booking.start.split('T')[0];
            return bookingDate === date;
          });
          
          return filtered;
        }
        throw new Error(response.message || 'Invalid response format');
      }),
      catchError((error: HttpErrorResponse) => {
        return useMockFallback();
      })
    );
  }

  /**
   * Recupera le prenotazioni dal mock locale
   * Aggiorna le date statiche con date dinamiche relative a oggi
   */
  private getMockBookings(): Observable<{ bookings: Booking[]; allBookings: Booking[] }> {
    return this.http.get<{ bookings: Booking[]; allBookings: Booking[] }>(this.MOCK_URL).pipe(
      map(data => {
        // Calcola date dinamiche: oggi, domani, dopodomani
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        
        const formatDateISO = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Mappa delle date originali alle nuove date dinamiche
        const dateMap: { [key: string]: string } = {
          '2025-12-18': formatDateISO(tomorrow),
          '2025-12-19': formatDateISO(dayAfter),
          '2025-12-20': formatDateISO(new Date(dayAfter.getTime() + 24 * 60 * 60 * 1000))
        };
        
        // Aggiorna le date nelle prenotazioni
        const updatedBookings = data.bookings.map(booking => {
          if (booking.start) {
            const originalDate = booking.start.split('T')[0];
            const newDate = dateMap[originalDate] || originalDate;
            const time = booking.start.split('T')[1];
            return {
              ...booking,
              start: `${newDate}T${time}`,
              end: booking.end ? `${newDate}T${booking.end.split('T')[1]}` : booking.end
            };
          }
          return booking;
        });
        
        // Aggiorna le date in allBookings
        const updatedAllBookings = data.allBookings.map(booking => {
          if (booking.start) {
            const originalDate = booking.start.split('T')[0];
            const newDate = dateMap[originalDate] || originalDate;
            const time = booking.start.split('T')[1];
            return {
              ...booking,
              start: `${newDate}T${time}`,
              end: booking.end ? `${newDate}T${booking.end.split('T')[1]}` : booking.end
            };
          }
          return booking;
        });
        
        return {
          bookings: updatedBookings,
          allBookings: updatedAllBookings
        };
      }),
      catchError(error => {
        console.error('Errore nel caricamento del mock prenotazioni:', error);
        // Fallback a dati di default vuoti
        return of({
          bookings: [],
          allBookings: []
        });
      })
    );
  }

  /**
   * Crea una nuova prenotazione
   */
  createBooking(booking: Booking): Observable<{ success: boolean; data: Booking; message?: string }> {
    if (!this.isServerAvailable()) {
      // Se il server non è disponibile, simula la creazione localmente
      return of({
        success: true,
        data: booking,
        message: 'Prenotazione creata (mock locale)'
      });
    }

    return this.http.post<{ success: boolean; data: Booking; message?: string }>(this.API_URL, booking).pipe(
      map(response => {
        this.serverAvailable = true;
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula comunque la creazione
        return of({
          success: true,
          data: booking,
          message: 'Prenotazione creata (fallback mock)'
        });
      })
    );
  }

  /**
   * Elimina una prenotazione
   */
  deleteBooking(bookingId: string): Observable<{ success: boolean; message?: string }> {
    if (!this.isServerAvailable()) {
      return of({
        success: true,
        message: 'Prenotazione eliminata (mock locale)'
      });
    }

    return this.http.delete<{ success: boolean; message?: string }>(`${this.API_URL}/${bookingId}`).pipe(
      map(response => {
        this.serverAvailable = true;
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        // In caso di errore, simula comunque l'eliminazione
        return of({
          success: true,
          message: 'Prenotazione eliminata (fallback mock)'
        });
      })
    );
  }
}

