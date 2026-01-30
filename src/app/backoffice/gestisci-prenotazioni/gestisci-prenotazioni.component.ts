import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService } from './bookings.service';
import { Booking } from '../../shared/models/booking-data.interface';

declare var FullCalendar: any;
declare var bootstrap: any;

@Component({
  selector: 'app-gestisci-prenotazioni',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gestisci-prenotazioni.component.html',
  styleUrl: './gestisci-prenotazioni.component.css'
})
export class GestisciPrenotazioniComponent implements OnInit, AfterViewInit, OnDestroy {
  calendar: any;
  bookings: Booking[] = [];
  allBookings: Booking[] = [];
  MAX_CAPACITY: number = 5; // Valore di default, viene caricato da localStorage
  private readonly STORAGE_KEY = 'capacita_massima_palestra';
  private storageListener?: (e: StorageEvent) => void;
  private visibilityListener?: () => void;
  private capacityChangeListener?: (e: CustomEvent) => void;
  selectedDateForBooking: Date | null = null;
  currentViewingEvent: any = null;
  isLoading: boolean = true;

  constructor(private bookingsService: BookingsService) {}

  users = [
    { id: '1', name: 'Mario Rossi', company: 'Acme Corporation' },
    { id: '2', name: 'Laura Bianchi', company: 'TechSolutions S.r.l.' },
    { id: '3', name: 'Giovanni Verdi', company: 'Global Industries' },
    { id: '4', name: 'Anna Ferrari', company: 'Innovation Labs' },
    { id: '5', name: 'Paolo Neri', company: 'Digital Services' },
    { id: '6', name: 'Maria Russo', company: 'Acme Corporation' },
    { id: '7', name: 'Luca Colombo', company: 'TechSolutions S.r.l.' },
    { id: '8', name: 'Giulia Esposito', company: 'Global Industries' }
  ];


  ngOnInit() {
    // Carica la capacità massima da localStorage
    this.loadMaxCapacity();
    // Carica i dati delle prenotazioni dal microservizio
    this.loadBookings();
    
    // Listener per cambiamenti in localStorage (da altre tab/window)
    this.storageListener = (e: StorageEvent) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        const capacity = parseInt(e.newValue, 10);
        if (capacity && capacity > 0 && capacity !== this.MAX_CAPACITY) {
          this.MAX_CAPACITY = capacity;
          this.updateCalendarEvents();
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
    
    // Listener per quando la pagina diventa visibile (ricarica la capacità)
    this.visibilityListener = () => {
      if (!document.hidden) {
        this.loadMaxCapacity();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
    
    // Listener per evento personalizzato quando la capacità cambia nella stessa tab
    this.capacityChangeListener = (e: CustomEvent) => {
      if (e.detail && e.detail.capacity) {
        const newCapacity = parseInt(e.detail.capacity, 10);
        if (newCapacity && newCapacity > 0 && newCapacity !== this.MAX_CAPACITY) {
          this.MAX_CAPACITY = newCapacity;
          this.updateCalendarEvents();
        }
      }
    };
    window.addEventListener('capacitaMassimaChanged', this.capacityChangeListener as EventListener);
  }

  /**
   * Carica la capacità massima da localStorage
   */
  loadMaxCapacity() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      const capacity = parseInt(saved, 10);
      if (capacity && capacity > 0) {
        this.MAX_CAPACITY = capacity;
        // Se il calendario è già inizializzato, aggiorna la visualizzazione
        if (this.calendar) {
          this.updateCalendarEvents();
        }
      }
    }
  }

  /**
   * Aggiorna gli eventi del calendario dopo il cambio di capacità
   */
  private updateCalendarEvents() {
    if (!this.calendar) return;
    
    // Ricarica le prenotazioni per aggiornare i badge di disponibilità
    this.loadBookings();
  }

  ngAfterViewInit() {
    // Inizializza il calendario dopo che la vista è stata caricata
    // Aspetta che FullCalendar sia caricato e che i dati siano stati caricati
    this.waitForFullCalendar(() => {
      // Se i dati sono già stati caricati, inizializza subito
      if (!this.isLoading) {
        this.initializeCalendar();
        this.setupModalHandlers();
      } else {
        // Altrimenti aspetta che i dati siano caricati
        const checkDataLoaded = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(checkDataLoaded);
            this.initializeCalendar();
            this.setupModalHandlers();
          }
        }, 100);
        
        // Timeout di sicurezza dopo 5 secondi
        setTimeout(() => {
          clearInterval(checkDataLoaded);
          if (this.isLoading) {
            this.isLoading = false;
            this.initializeCalendar();
            this.setupModalHandlers();
          }
        }, 5000);
      }
    });
  }

  private waitForFullCalendar(callback: () => void) {
    if (typeof (window as any).FullCalendar !== 'undefined') {
      callback();
    } else {
      // Riprova dopo un breve delay
      setTimeout(() => this.waitForFullCalendar(callback), 100);
    }
  }

  ngOnDestroy() {
    if (this.calendar) {
      this.calendar.destroy();
    }
    
    // Rimuovi i listener
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    if (this.capacityChangeListener) {
      window.removeEventListener('capacitaMassimaChanged', this.capacityChangeListener as EventListener);
    }
  }


  private formatDateISO(date: Date): string {
    // Usa la data locale invece di UTC per evitare problemi di fuso orario
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Carica le prenotazioni dal microservizio
   */
  private loadBookings() {
    this.isLoading = true;
    this.bookingsService.getBookings().subscribe({
      next: (data) => {
        this.bookings = data.bookings;
        this.allBookings = data.allBookings;
        this.isLoading = false;
        // Se il calendario è già inizializzato, aggiorna gli eventi
        if (this.calendar) {
          this.refreshCalendar();
        }
      },
      error: (error) => {
        this.isLoading = false;
        // In caso di errore, usa array vuoti
        this.bookings = [];
        this.allBookings = [];
        // Aggiorna comunque il calendario per mostrare che non ci sono prenotazioni
        if (this.calendar) {
          this.refreshCalendar();
        }
      }
    });
  }

  /**
   * Aggiorna il calendario con i nuovi dati
   */
  private refreshCalendar() {
    if (!this.calendar) {
      return;
    }
    
    // Rimuovi tutti gli eventi esistenti
    const existingEvents = this.calendar.getEvents();
    existingEvents.forEach((event: any) => {
      event.remove();
    });

    // Rigenera gli eventi
    const groupedEvents = this.generateGroupedBookingEvents();
    const newBackgrounds = this.generateAvailabilityBackgrounds();
    
    // Aggiungi tutti gli eventi
    const allNewEvents = [...groupedEvents, ...newBackgrounds];
    
    allNewEvents.forEach((event) => {
      try {
        this.calendar.addEvent(event);
      } catch (e) {
        // Ignora errori silenziosamente
      }
    });
    
    // Forza il render del calendario
    setTimeout(() => {
      this.calendar.render();
    }, 200);
  }

  private countBookingsInSlot(slotStart: Date, slotEnd: Date): number {
    let count = 0;
    this.allBookings.forEach(booking => {
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);
      if (bookingStart < slotEnd && bookingEnd > slotStart) {
        count++;
      }
    });
    return count;
  }

  private generateGroupedBookingEvents(): Booking[] {
    const groupedEvents: Booking[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset ore per confronto corretto
    const processedDays = new Map<string, any>(); // Per la vista mensile: un evento allDay per giorno
    const processedTimeSlots = new Map<string, Booking>(); // Per la vista settimanale/giornaliera: un evento per slot unificato
    
    // Raggruppa tutte le prenotazioni per data (non solo i prossimi giorni)
    const bookingsByDate = new Map<string, Booking[]>();
    
    this.bookings.forEach(booking => {
      if (!booking.start) {
        return;
      }
      try {
        const bookingDate = new Date(booking.start).toISOString().split('T')[0];
        if (!bookingsByDate.has(bookingDate)) {
          bookingsByDate.set(bookingDate, []);
        }
        bookingsByDate.get(bookingDate)!.push(booking);
      } catch (e) {
        // Ignora errori di parsing
      }
    });
    
    // Processa tutte le date trovate
    bookingsByDate.forEach((dayBookings, dateStr) => {

      // Per la vista mensile: crea UN SOLO evento allDay per giorno
      // Assicurati che la data sia nel formato corretto (YYYY-MM-DD) senza orario
      const allDayEvent: any = {
        id: `day_${dateStr}`,
        title: 'Prenotazione',
        start: dateStr, // Formato YYYY-MM-DD per eventi allDay
        allDay: true,
        display: 'block', // Forza la visualizzazione come blocco nella vista mensile
        backgroundColor: '#405189',
        borderColor: '#405189',
        textColor: '#fff',
        classNames: ['fc-event', 'fc-event-solid', 'fc-daygrid-event'],
        extendedProps: {
          bookings: dayBookings,
          count: dayBookings.length
        }
      };

      processedDays.set(dateStr, allDayEvent);
      groupedEvents.push(allDayEvent);

        // Per la vista settimanale/giornaliera: raggruppa le prenotazioni che si sovrappongono
        // Trova tutti gli intervalli di tempo unici dove ci sono prenotazioni
        const timeRanges: Array<{ start: Date; end: Date; bookings: Booking[] }> = [];
        
        dayBookings.forEach(booking => {
          const bookingStart = new Date(booking.start);
          const bookingEnd = new Date(booking.end);
          
          // Cerca se questo booking si sovrappone a un range esistente
          let merged = false;
          for (let i = 0; i < timeRanges.length; i++) {
            const range = timeRanges[i];
            // Se si sovrappone o è adiacente, unifica
            if (bookingStart <= range.end && bookingEnd >= range.start) {
              range.start = bookingStart < range.start ? bookingStart : range.start;
              range.end = bookingEnd > range.end ? bookingEnd : range.end;
              if (!range.bookings.find(b => b.id === booking.id)) {
                range.bookings.push(booking);
              }
              merged = true;
              break;
            }
          }
          
          // Se non si è unito a nessun range, creane uno nuovo
          if (!merged) {
            timeRanges.push({
              start: bookingStart,
              end: bookingEnd,
              bookings: [booking]
            });
          }
        });

        // Unifica ulteriormente i range che si sovrappongono dopo il primo passaggio
        for (let i = timeRanges.length - 1; i >= 0; i--) {
          for (let j = i - 1; j >= 0; j--) {
            if (timeRanges[i].start <= timeRanges[j].end && timeRanges[i].end >= timeRanges[j].start) {
              // Unifica
              timeRanges[j].start = timeRanges[i].start < timeRanges[j].start ? timeRanges[i].start : timeRanges[j].start;
              timeRanges[j].end = timeRanges[i].end > timeRanges[j].end ? timeRanges[i].end : timeRanges[j].end;
              timeRanges[i].bookings.forEach(b => {
                if (!timeRanges[j].bookings.find(existing => existing.id === b.id)) {
                  timeRanges[j].bookings.push(b);
                }
              });
              timeRanges.splice(i, 1);
              break;
            }
          }
        }

        // Crea un evento per ogni range unificato (solo per viste timeGrid, non allDay)
        timeRanges.forEach((range, index) => {
          const slotKey = `${dateStr}_${index}`;
          
          if (!processedTimeSlots.has(slotKey)) {
            // Arrotonda ai 30 minuti più vicini
            const roundedStart = new Date(range.start);
            roundedStart.setMinutes(Math.floor(roundedStart.getMinutes() / 30) * 30, 0, 0);
            
            const roundedEnd = new Date(range.end);
            roundedEnd.setMinutes(Math.ceil(roundedEnd.getMinutes() / 30) * 30, 0, 0);

            const slotEvent: any = {
              id: `slot_${slotKey}`,
              title: 'Prenotazione',
              start: roundedStart.toISOString(),
              end: roundedEnd.toISOString(),
              backgroundColor: '#405189',
              borderColor: '#405189',
              display: 'block', // Mostra solo nelle viste timeGrid
              extendedProps: {
                bookings: range.bookings,
                count: range.bookings.length
              }
            };

            groupedEvents.push(slotEvent);
            processedTimeSlots.set(slotKey, slotEvent);
          }
        });
    });

    return groupedEvents;
  }

  private generateAvailabilityBackgrounds(): any[] {
    const backgrounds: any[] = [];
    const today = new Date();

    for (let day = 0; day < 14; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      for (let hour = 6; hour < 23; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

          const count = this.countBookingsInSlot(slotStart, slotEnd);
          let bgColor: string, title: string;

          if (count >= this.MAX_CAPACITY) {
            bgColor = '#f06548';
            title = `Occupato (${count}/${this.MAX_CAPACITY})`;
          } else if (count > 0) {
            bgColor = '#f7b84b';
            title = `Parzialmente occupato (${count}/${this.MAX_CAPACITY})`;
          } else {
            bgColor = 'rgba(10, 179, 156, 0.15)';
            title = 'Disponibile';
          }

          backgrounds.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            display: 'background',
            backgroundColor: bgColor,
            title: title
          });
        }
      }
    }

    return backgrounds;
  }

  private initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const FullCalendar = (window as any).FullCalendar;
    
    if (!calendarEl || !FullCalendar) {
      return;
    }

    // Genera gli eventi prima di inizializzare il calendario
    const groupedEvents = this.generateGroupedBookingEvents();
    const newBackgrounds = this.generateAvailabilityBackgrounds();
    const allEvents = [...groupedEvents, ...newBackgrounds];

    // Inizializza il calendario con gli eventi
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'it',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      initialView: 'dayGridMonth',
      slotMinTime: '06:00:00',
      slotMaxTime: '23:00:00',
      slotDuration: '00:30:00',
      allDaySlot: false, // Nasconde solo la barra allDay nelle viste timeGrid, non nella vista mensile
      editable: false,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: 1, // Mostra solo un evento per giorno nella vista mensile (raggruppa tutte le prenotazioni)
      weekends: true,
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        startTime: '06:00',
        endTime: '23:00'
      },
      events: allEvents, // Aggiungi gli eventi direttamente nella configurazione
      dateClick: (info: any) => {
        if (this.calendar && this.calendar.view && this.calendar.view.type === 'dayGridMonth') {
          this.openBookingModalWithDayView(info.date);
        }
      },
      select: (info: any) => {
        const selectedDate = new Date(info.start);
        selectedDate.setHours(0, 0, 0, 0);
        this.openBookingModalWithDayView(selectedDate);
        if (this.calendar) {
          this.calendar.unselect();
        }
      },
      eventClick: (info: any) => {
        if (info.event && info.event.display !== 'background') {
          // Sempre apri la modale con i dettagli del giorno (carica dal servizio)
          let eventDate: Date;
          if (info.event.start instanceof Date) {
            eventDate = new Date(info.event.start);
          } else if (typeof info.event.start === 'string') {
            eventDate = new Date(info.event.start);
          } else {
            return;
          }
          eventDate.setHours(0, 0, 0, 0);
          this.openBookingModalWithDayView(eventDate);
        }
      },
      eventMouseEnter: (info: any) => {
        if (info.event && info.event.display !== 'background' && info.el) {
          info.el.style.cursor = 'pointer';
        }
      },
      eventDidMount: (info: any) => {
        if (info.event && info.event.display === 'background' && info.event.title && info.el) {
          info.el.title = info.event.title;
        }
        // Rimuovi sempre tutti i link "+X more" in tutte le viste
        const removeMoreLinks = () => {
          document.querySelectorAll('.fc-more-link, .fc-daygrid-more-link').forEach((link: any) => {
            link.style.display = 'none';
            link.style.visibility = 'hidden';
            link.style.opacity = '0';
            link.style.height = '0';
            link.style.width = '0';
            link.style.padding = '0';
            link.style.margin = '0';
            link.style.fontSize = '0';
            link.style.lineHeight = '0';
            link.textContent = '';
            link.remove();
          });
        };
        
        // Rimuovi immediatamente e anche dopo un delay per catturare quelli aggiunti dopo
        removeMoreLinks();
        setTimeout(removeMoreLinks, 100);
        setTimeout(removeMoreLinks, 300);
      },
      dayCellDidMount: (info: any) => {
        if (this.calendar && this.calendar.view && this.calendar.view.type === 'dayGridMonth') {
          const dayStart = new Date(info.date);
          dayStart.setHours(6, 0, 0, 0);
          const dayEnd = new Date(info.date);
          dayEnd.setHours(23, 0, 0, 0);

          let maxOccupancy = 0;
          let hasAvailability = false;

          for (let hour = 6; hour < 23; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const slotStart = new Date(info.date);
              slotStart.setHours(hour, minute, 0, 0);
              const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

              const count = this.countBookingsInSlot(slotStart, slotEnd);
              if (count > maxOccupancy) maxOccupancy = count;
              if (count < this.MAX_CAPACITY) hasAvailability = true;
            }
          }

          if (info.el) {
            if (maxOccupancy >= this.MAX_CAPACITY && !hasAvailability) {
              info.el.style.backgroundColor = 'rgba(240, 101, 72, 0.2)';
            } else if (maxOccupancy > 0) {
              info.el.style.backgroundColor = 'rgba(247, 184, 75, 0.15)';
            } else {
              info.el.style.backgroundColor = 'rgba(10, 179, 156, 0.1)';
            }
            
            // Rimuovi i link "+X more" da questa cella del giorno
            const moreLinks = info.el.querySelectorAll('.fc-more-link, .fc-daygrid-more-link');
            moreLinks.forEach((link: any) => {
              link.style.display = 'none';
              link.style.visibility = 'hidden';
              link.style.opacity = '0';
              link.style.height = '0';
              link.style.width = '0';
              link.style.padding = '0';
              link.style.margin = '0';
              link.style.fontSize = '0';
              link.style.lineHeight = '0';
              link.textContent = '';
              link.remove();
            });
          }
        }
      }
    });

    this.calendar.render();
  }

  private setupModalHandlers() {
    // Gestione modale viewDayBookingsModal
    const viewDayBookingsModalElement = document.getElementById('viewDayBookingsModal');
    if (viewDayBookingsModalElement) {
      // Evento quando la modale viene chiusa
      viewDayBookingsModalElement.addEventListener('hidden.bs.modal', () => {
        this.cleanupModal();
      });

      // I pulsanti di chiusura sono gestiti tramite (click) nel template
    }

    // Gestione modale viewBookingModal
    const viewBookingModalElement = document.getElementById('viewBookingModal');
    if (viewBookingModalElement) {
      viewBookingModalElement.addEventListener('hidden.bs.modal', () => {
        this.cleanupModal();
      });

      // I pulsanti di chiusura sono gestiti tramite (click) nel template
    }

    // Gestione modale bookingModal
    const bookingModalElement = document.getElementById('bookingModal');
    if (bookingModalElement) {
      bookingModalElement.addEventListener('hidden.bs.modal', () => {
        this.cleanupModal();
      });

      // I pulsanti di chiusura sono gestiti tramite (click) nel template
    }
  }


  private cleanupModal() {
    // Rimuovi tutti i backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Rimuovi tutte le classi e stili di modale dal body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Assicurati che tutte le modali siano chiuse visivamente
    const allModals = document.querySelectorAll('.modal.show');
    allModals.forEach(modal => {
      (modal as HTMLElement).classList.remove('show');
      (modal as HTMLElement).style.display = 'none';
    });
  }


  openBookingModalWithDayView(date: Date) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = date.toLocaleDateString('it-IT', options);
    const dateElement = document.getElementById('viewDayBookingsDate');
    if (dateElement) {
      dateElement.textContent = dateStr;
    }

    this.selectedDateForBooking = date;

    const tableBody = document.getElementById('viewDayBookingsTableBody');
    if (!tableBody) {
      return;
    }

    // Mostra loading
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Caricamento...</span>
          </div>
        </td>
      </tr>
    `;

    // Carica i dettagli delle prenotazioni per questo giorno dal servizio
    const dateISO = this.formatDateISO(date);
    this.bookingsService.getBookingsByDate(dateISO).subscribe({
      next: (dayBookings) => {
        // Filtro aggiuntivo per sicurezza
        const filteredBookings = dayBookings.filter(booking => {
          const bookingDate = this.formatDateISO(new Date(booking.start));
          return bookingDate === dateISO;
        });
        
        tableBody.innerHTML = '';
        
        if (filteredBookings.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="3" class="text-center text-muted py-4">
                <i class="ri-calendar-check-line fs-20 d-block mb-2"></i>
                Nessuna prenotazione per questo giorno
              </td>
            </tr>
          `;
        } else {
          // Raggruppa le prenotazioni per slot di 30 minuti
          const dayStart = new Date(date);
          dayStart.setHours(6, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 0, 0, 0);

          let currentTime = new Date(dayStart);
          let hasBookings = false;

          while (currentTime < dayEnd) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime.getTime() + 30 * 60000);

            // Trova tutte le prenotazioni che si sovrappongono a questo slot (usa filteredBookings invece di dayBookings)
            const overlappingBookings = filteredBookings.filter(booking => {
              const bookingStart = new Date(booking.start);
              const bookingEnd = new Date(booking.end);
              return bookingStart < slotEnd && bookingEnd > slotStart;
            });

            const count = overlappingBookings.length;

            if (count > 0) {
              hasBookings = true;
              let occupancyBadge = '';
              if (count >= this.MAX_CAPACITY) {
                occupancyBadge = '<span class="badge bg-danger-subtle text-danger">Completo</span>';
              } else if (count > 0) {
                occupancyBadge = '<span class="badge bg-warning-subtle text-warning">Pochi posti</span>';
              }

              const usersHtml = overlappingBookings.map(booking => {
                // Prova a recuperare il nome utente da varie fonti
                const userName = booking.extendedProps?.user || 
                                 booking.user || 
                                 (booking.extendedProps?.bookings && booking.extendedProps.bookings[0]?.extendedProps?.user) ||
                                 'Utente Sconosciuto';
                const userInitials = userName.substring(0, 2).toUpperCase();
                
                // Estrai orario dalla prenotazione
                const bookingStart = new Date(booking.start);
                const bookingEnd = new Date(booking.end);
                const timeRange = `${String(bookingStart.getHours()).padStart(2, '0')}:${String(bookingStart.getMinutes()).padStart(2, '0')} - ${String(bookingEnd.getHours()).padStart(2, '0')}:${String(bookingEnd.getMinutes()).padStart(2, '0')}`;
                
                return `
                  <div class="d-flex align-items-center mb-2">
                    <div class="avatar-xxs me-2">
                      <div class="avatar-title bg-primary-subtle text-primary rounded-circle fs-10">${userInitials}</div>
                    </div>
                    <div class="flex-grow-1">
                      <span class="fs-13 fw-semibold d-block">${userName}</span>
                      <small class="text-muted d-block">${timeRange}</small>
                    </div>
                  </div>
                `;
              }).join('');

              const timeStr = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')} - ${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`;

              const row = `
                <tr>
                  <td class="fw-semibold">${timeStr}</td>
                  <td>${usersHtml}</td>
                  <td>${count} / ${this.MAX_CAPACITY} persone<br>${occupancyBadge}</td>
                </tr>
              `;
              tableBody.innerHTML += row;
            }

            currentTime = slotEnd;
          }

          if (!hasBookings) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="3" class="text-center text-muted py-4">
                  <i class="ri-calendar-check-line fs-20 d-block mb-2"></i>
                  Nessuna prenotazione per questo giorno
                </td>
              </tr>
            `;
          }
        }

        // Apri la modale
        const modalElement = document.getElementById('viewDayBookingsModal');
        if (modalElement) {
          const BootstrapModal = (window as any).bootstrap?.Modal;
          if (BootstrapModal) {
            const modal = new BootstrapModal(modalElement);
            modal.show();
          } else {
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            document.body.classList.add('modal-open');
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
          }
        }
      },
      error: (error) => {
        tableBody.innerHTML = `
          <tr>
            <td colspan="3" class="text-center text-danger py-4">
              <i class="ri-error-warning-line fs-20 d-block mb-2"></i>
              Errore nel caricamento delle prenotazioni
            </td>
          </tr>
        `;
      }
    });
  }

  openCreateBookingModal() {
    // Chiudi e pulisci completamente la modale corrente
    const viewModalElement = document.getElementById('viewDayBookingsModal');
    if (viewModalElement) {
      // Rimuovi tutte le classi di modale aperta
      viewModalElement.classList.remove('show');
      viewModalElement.style.display = 'none';
      viewModalElement.setAttribute('aria-hidden', 'true');
      viewModalElement.removeAttribute('aria-modal');
      
      const BootstrapModal = (window as any).bootstrap?.Modal;
      if (BootstrapModal) {
        const viewModal = BootstrapModal.getInstance(viewModalElement);
        if (viewModal) {
          viewModal.hide();
        }
      }
    }
    
    // Pulisci completamente backdrop e classi del body
    this.cleanupModal();
    
    // Aspetta che la modale sia completamente chiusa prima di aprire la nuova
    setTimeout(() => {
      this.openBookingModalAfterClose();
    }, 400);
  }

  private openBookingModalAfterClose() {
    // Assicurati che non ci siano backdrop residui
    this.cleanupModal();
    
    if (this.selectedDateForBooking) {
      const year = this.selectedDateForBooking.getFullYear();
      const month = String(this.selectedDateForBooking.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDateForBooking.getDate()).padStart(2, '0');
      const dateInput = document.getElementById('bookingDate') as HTMLInputElement;
      if (dateInput) {
        dateInput.value = `${year}-${month}-${day}`;
      }
    }

    const startTimeInput = document.getElementById('bookingStartTime') as HTMLInputElement;
    const endTimeInput = document.getElementById('bookingEndTime') as HTMLInputElement;
    const userSelect = document.getElementById('bookingUser') as HTMLSelectElement;

    if (startTimeInput) startTimeInput.value = '';
    if (endTimeInput) endTimeInput.value = '';
    if (userSelect) userSelect.value = '';

    const availabilityInfo = document.getElementById('availabilityInfo');
    if (availabilityInfo) {
      availabilityInfo.style.display = 'none';
    }

    // Ora apri la nuova modale
    const modalElement = document.getElementById('bookingModal');
    if (modalElement) {
      const BootstrapModal = (window as any).bootstrap?.Modal;
      if (BootstrapModal) {
        // Assicurati che non ci siano istanze esistenti
        const existingModal = BootstrapModal.getInstance(modalElement);
        if (existingModal) {
          existingModal.dispose();
        }
        
        const modal = new BootstrapModal(modalElement);
        modal.show();
      } else {
        // Fallback
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        modalElement.setAttribute('aria-modal', 'true');
        modalElement.removeAttribute('aria-hidden');
        document.body.classList.add('modal-open');
      }
    }
  }

  showBookingDetails(event: any) {
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    this.openBookingModalWithDayView(eventDate);
  }

  deleteCurrentBooking() {
    if (!this.currentViewingEvent) return;

    if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
      const bookingId = this.currentViewingEvent.id;
      
      // Se l'evento ha prenotazioni raggruppate, elimina tutte le prenotazioni
      if (this.currentViewingEvent.extendedProps && this.currentViewingEvent.extendedProps.bookings) {
        const bookingsToRemove = this.currentViewingEvent.extendedProps.bookings;
        // Elimina tutte le prenotazioni raggruppate
        bookingsToRemove.forEach((booking: Booking) => {
          this.bookingsService.deleteBooking(booking.id).subscribe({
            next: () => {
              // Rimuovi localmente
              const indexAll = this.allBookings.findIndex(b => b.id === booking.id);
              if (indexAll > -1) {
                this.allBookings.splice(indexAll, 1);
              }
              const indexBookings = this.bookings.findIndex(b => b.id === booking.id);
              if (indexBookings > -1) {
                this.bookings.splice(indexBookings, 1);
              }
            }
          });
        });
      } else {
        // Elimina la prenotazione singola
        this.bookingsService.deleteBooking(bookingId).subscribe({
          next: () => {
            // Rimuovi localmente
            const indexAll = this.allBookings.findIndex(b => b.id === bookingId);
            if (indexAll > -1) {
              this.allBookings.splice(indexAll, 1);
            }
            const indexBookings = this.bookings.findIndex(b => b.id === bookingId);
            if (indexBookings > -1) {
              this.bookings.splice(indexBookings, 1);
            }
            
            // Aggiorna il calendario
            this.refreshCalendar();
          }
        });
      }

      // Aggiorna il calendario
      this.refreshCalendar();

      const modalElement = document.getElementById('viewBookingModal');
      if (modalElement) {
        const BootstrapModal = (window as any).bootstrap?.Modal;
        if (BootstrapModal) {
          const modal = BootstrapModal.getInstance(modalElement);
          if (modal) {
            modal.hide();
          }
        }
      }

      alert('Prenotazione cancellata con successo!');
      this.currentViewingEvent = null;
    }
  }

  checkAvailabilityForPeriod(start: Date, end: Date): number {
    let maxCount = 0;
    const periodStart = new Date(start);
    const periodEnd = new Date(end);

    let currentSlot = new Date(periodStart);
    while (currentSlot < periodEnd) {
      const slotEnd = new Date(currentSlot.getTime() + 30 * 60000);
      const count = this.countBookingsInSlot(currentSlot, slotEnd);
      if (count > maxCount) maxCount = count;
      currentSlot = slotEnd;
    }
    return maxCount;
  }

  confirmBooking() {
    const userSelect = document.getElementById('bookingUser') as HTMLSelectElement;
    const dateInput = document.getElementById('bookingDate') as HTMLInputElement;
    const startTimeInput = document.getElementById('bookingStartTime') as HTMLInputElement;
    const endTimeInput = document.getElementById('bookingEndTime') as HTMLInputElement;

    if (!userSelect || !dateInput || !startTimeInput || !endTimeInput) return;

    const userId = userSelect.value;
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (!userId) {
      alert('Seleziona un utente!');
      return;
    }

    if (!date || !startTime || !endTime) {
      alert('Per favore compila tutti i campi!');
      return;
    }

    const selectedUserText = userSelect.options[userSelect.selectedIndex].text;
    const userName = selectedUserText.split(' - ')[0];

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (durationMinutes < 30) {
      alert('La durata minima della prenotazione è 30 minuti!');
      return;
    }

    if (durationMinutes > 120) {
      alert('La durata massima della prenotazione è 2 ore!');
      return;
    }

    if (end <= start) {
      alert('L\'orario di fine deve essere successivo all\'orario di inizio!');
      return;
    }

    const finalCheck = this.checkAvailabilityForPeriod(start, end);
    if (finalCheck >= this.MAX_CAPACITY) {
      alert('⚠️ Spiacenti, la palestra è diventata al completo per questo orario.\n\nQualcun altro ha appena prenotato. Prova un altro orario.');
      return;
    }

    const newEvent: Booking = {
      id: String(Date.now()),
      title: 'Prenotazione',
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        user: userName
      }
    };

    // Crea la prenotazione tramite il servizio
    this.bookingsService.createBooking(newEvent).subscribe({
      next: (response) => {
        // Aggiungi la nuova prenotazione agli array locali
        this.bookings.push(response.data);
        this.allBookings.push({
          id: response.data.id,
          user: userName,
          start: response.data.start,
          end: response.data.end
        });

        const modalElement = document.getElementById('bookingModal');
        if (modalElement) {
          const BootstrapModal = (window as any).bootstrap?.Modal;
          if (BootstrapModal) {
            const modal = BootstrapModal.getInstance(modalElement);
            if (modal) {
              modal.hide();
            }
          }
        }

        // Aggiorna il calendario
        this.refreshCalendar();

        alert(`✓ Prenotazione creata con successo!\n\nUtente: ${userName}\nData: ${new Date(date).toLocaleDateString('it-IT')}\nOrario: ${startTime} - ${endTime}`);
      },
      error: (error) => {
        alert('Errore nella creazione della prenotazione. Riprova.');
      }
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Metodo pubblico per chiudere le modali dal template
  closeModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    const BootstrapModal = (window as any).bootstrap?.Modal;
    if (BootstrapModal) {
      const modal = BootstrapModal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      } else {
        // Se non c'è un'istanza, creane una e chiudila
        const newModal = new BootstrapModal(modalElement);
        newModal.hide();
      }
    } else {
      // Fallback: chiudi manualmente
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      modalElement.setAttribute('aria-hidden', 'true');
      modalElement.removeAttribute('aria-modal');
      this.cleanupModal();
    }
  }

}

