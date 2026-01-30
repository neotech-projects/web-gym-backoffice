import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { NotificationService, Notification } from '../../shared/services/notification.service';
import { UsersService } from '../gestisci-utenti/users.service';
import { User } from '../../shared/models/user-data.interface';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-backoffice-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './backoffice-layout.component.html',
  styleUrl: './backoffice-layout.component.css'
})
export class BackofficeLayoutComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isAdmin: boolean = false;
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  unreadCount: number = 0;
  notificationMatricolaFilter: string = '';
  private notificationsSubscription?: Subscription;
  private checkInterval?: Subscription;
  private processedNotifications: Set<string> = new Set(); // Traccia le notifiche già processate
  
  // Getter per verificare se è admin (più affidabile)
  get userIsAdmin(): boolean {
    return this.authService.isAdmin();
  }
  
  get currentYear(): number {
    return new Date().getFullYear();
  }
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    // Verifica se l'utente è autenticato
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Carica informazioni utente immediatamente
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();

    // Sottoscrivi ai cambiamenti dell'utente
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin();
      if (!user) {
        this.router.navigate(['/auth/login']);
      }
    });

    // Sottoscrivi alle notifiche
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      this.applyNotificationFilter();
      this.unreadCount = this.notificationService.getUnreadCount();
    });

    // Pulisci le notifiche vecchie e ricreale con la logica corretta
    this.recreateMissedBookingNotifications();

    // Carica le notifiche già processate da localStorage
    this.loadProcessedNotifications();

    // Controlla immediatamente le prenotazioni saltate
    this.checkMissedBookings();

    // Controlla periodicamente le prenotazioni saltate ogni 5 minuti
    this.checkInterval = interval(5 * 60 * 1000).subscribe(() => {
      this.checkMissedBookings();
    });

    // Inizializzazione del layout
    this.initMobileMenu();
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy() {
    // Cleanup se necessario
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
    if (this.checkInterval) {
      this.checkInterval.unsubscribe();
    }
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Elimina una notifica
   */
  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId);
  }

  /**
   * Formatta il tempo trascorso
   */
  getTimeAgo(timestamp: Date): string {
    return this.notificationService.getTimeAgo(timestamp);
  }

  /**
   * Ottiene la classe CSS per l'icona
   */
  getIconClass(notification: Notification): string {
    return this.notificationService.getIconClass(notification);
  }

  /**
   * Ottiene l'icona
   */
  getIcon(notification: Notification): string {
    return this.notificationService.getIcon(notification);
  }

  /**
   * Inizializza il menu mobile
   */
  private initMobileMenu() {
    // Assicura che il menu mobile funzioni correttamente
    const hamburger = document.getElementById('topnav-hamburger-icon');
    const verticalOverlay = document.querySelector('.vertical-overlay');
    
    if (!hamburger) return;
    
    // Override del click sul pulsante hamburger per assicurare che funzioni
    hamburger.addEventListener('click', function(e) {
      const width = window.innerWidth;
      
      if (width <= 767) {
        // Mobile: toggle sidebar-enable
        document.body.classList.toggle('vertical-sidebar-enable');
        
        // Assicura che la sidebar sia impostata su lg
        if (document.body.classList.contains('vertical-sidebar-enable')) {
          document.documentElement.setAttribute('data-sidebar-size', 'lg');
        }
      }
    }, true); // Use capture per eseguire prima di altri handler
    
    // Click sull'overlay per chiudere
    if (verticalOverlay) {
      verticalOverlay.addEventListener('click', function() {
        document.body.classList.remove('vertical-sidebar-enable');
      });
    }
  }

  /**
   * Toggle del menu collapsible
   */
  toggleMenu(event: Event, targetId: string) {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      const BootstrapCollapse = (window as any).bootstrap?.Collapse;
      if (BootstrapCollapse) {
        const collapse = new BootstrapCollapse(target, { toggle: true });
      } else {
        // Fallback manuale
        target.classList.toggle('show');
      }
    }
  }

  /**
   * Carica le notifiche già processate da localStorage
   */
  private loadProcessedNotifications(): void {
    const stored = localStorage.getItem('processedMissedBookings');
    if (stored) {
      try {
        this.processedNotifications = new Set(JSON.parse(stored));
      } catch (e) {
        console.error('Errore nel caricamento delle notifiche processate:', e);
        this.processedNotifications = new Set();
      }
    }
  }

  /**
   * Salva le notifiche processate in localStorage
   */
  private saveProcessedNotifications(): void {
    localStorage.setItem('processedMissedBookings', JSON.stringify(Array.from(this.processedNotifications)));
  }

  /**
   * Controlla le prenotazioni saltate e crea notifiche
   */
  private checkMissedBookings(): void {
    this.usersService.getUsers().subscribe({
      next: (users: User[]) => {
        const now = new Date();
        
        users.forEach(user => {
          if (!user.bookingHistory || user.bookingHistory.length === 0) {
            return;
          }

          // Calcola lo stato del semaforo
          const missedAccesses = user.bookingHistory.filter(booking => !booking.hasAccess).length;
          let trafficLightStatus: 'green' | 'orange' | 'red' = 'green';
          
          if (missedAccesses === 0) {
            trafficLightStatus = 'green';
          } else if (missedAccesses >= 3) {
            trafficLightStatus = 'red';
          } else {
            trafficLightStatus = 'orange';
          }

          // Ordina le prenotazioni per data e ora (più vecchie prima)
          const sortedBookings = [...user.bookingHistory].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
          });

          // Conta quante prenotazioni saltate ci sono state fino a ogni prenotazione
          let missedCountSoFar = 0;
          
          sortedBookings.forEach(booking => {
            // Se la prenotazione è saltata (hasAccess = false)
            if (!booking.hasAccess) {
              missedCountSoFar++; // Incrementa il contatore
              
              // Crea una chiave univoca per questa prenotazione saltata
              const notificationKey = `${user.id}_${booking.date}_${booking.time}`;
              
              // Verifica se abbiamo già processato questa prenotazione
              if (!this.processedNotifications.has(notificationKey)) {
                // Verifica se la prenotazione è passata (almeno 1 ora fa)
                const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
                const hoursDiff = (now.getTime() - bookingDateTime.getTime()) / (1000 * 60 * 60);
                
                // Crea la notifica solo se la prenotazione è passata da almeno 1 ora
                // (per evitare notifiche immediate per prenotazioni future o appena passate)
                if (hoursDiff >= 1) {
                  const userName = `${user.firstName} ${user.lastName}`;
                  
                  // Crea la notifica con il numero corretto di prenotazioni saltate fino a quel momento
                  this.notificationService.createMissedBookingNotification(
                    userName,
                    user.matricola,
                    booking.date,
                    booking.time,
                    missedCountSoFar // Passa il numero di prenotazioni saltate fino a questo momento
                  );
                  
                  // Segna come processata
                  this.processedNotifications.add(notificationKey);
                }
              }
            }
          });
        });

        // Salva le notifiche processate
        this.saveProcessedNotifications();
      },
      error: (error) => {
        console.error('Errore nel controllo delle prenotazioni saltate:', error);
      }
    });
  }

  /**
   * Applica il filtro per matricola alle notifiche
   */
  applyNotificationFilter(): void {
    if (!this.notificationMatricolaFilter || this.notificationMatricolaFilter.trim() === '') {
      this.filteredNotifications = [...this.notifications];
    } else {
      const filter = this.notificationMatricolaFilter.toUpperCase().trim();
      this.filteredNotifications = this.notifications.filter(notification => 
        notification.matricola && notification.matricola.toUpperCase().includes(filter)
      );
    }
  }

  /**
   * Pulisce il filtro delle notifiche
   */
  clearNotificationFilter(): void {
    this.notificationMatricolaFilter = '';
    this.applyNotificationFilter();
  }

  /**
   * Ricrea le notifiche per prenotazioni saltate con la logica corretta
   * Elimina le vecchie notifiche e le ricrea con il conteggio corretto
   */
  private recreateMissedBookingNotifications(): void {
    // Ottieni tutte le notifiche attuali
    const allNotifications = this.notificationService.getAllNotifications();
    
    // Filtra solo le notifiche per prenotazioni saltate (quelle che hanno bookingDate e bookingTime)
    const missedBookingNotifications = allNotifications.filter(n => 
      n.bookingDate && n.bookingTime && (n.type === 'missed_booking' || n.type === 'warning')
    );

    // Se non ci sono notifiche di prenotazioni saltate, non fare nulla
    if (missedBookingNotifications.length === 0) {
      return;
    }

    // Elimina tutte le notifiche per prenotazioni saltate
    missedBookingNotifications.forEach(notification => {
      this.notificationService.deleteNotification(notification.id);
    });

    // Pulisci anche le notifiche processate per ricrearle
    this.processedNotifications.clear();
    this.saveProcessedNotifications();

    // Ricrea immediatamente le notifiche con la logica corretta
    this.usersService.getUsers().subscribe({
      next: (users: User[]) => {
        const now = new Date();
        
        users.forEach(user => {
          if (!user.bookingHistory || user.bookingHistory.length === 0) {
            return;
          }

          // Ordina le prenotazioni per data e ora (più vecchie prima)
          const sortedBookings = [...user.bookingHistory].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
          });

          // Conta quante prenotazioni saltate ci sono state fino a ogni prenotazione
          let missedCountSoFar = 0;
          
          sortedBookings.forEach(booking => {
            // Se la prenotazione è saltata (hasAccess = false)
            if (!booking.hasAccess) {
              missedCountSoFar++; // Incrementa il contatore
              
              // Verifica se la prenotazione è passata (almeno 1 ora fa)
              const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
              const hoursDiff = (now.getTime() - bookingDateTime.getTime()) / (1000 * 60 * 60);
              
              // Crea la notifica solo se la prenotazione è passata da almeno 1 ora
              if (hoursDiff >= 1) {
                const userName = `${user.firstName} ${user.lastName}`;
                
                // Crea la notifica con il numero corretto di prenotazioni saltate fino a quel momento
                this.notificationService.createMissedBookingNotification(
                  userName,
                  user.matricola,
                  booking.date,
                  booking.time,
                  missedCountSoFar // Passa il numero di prenotazioni saltate fino a questo momento
                );
                
                // Segna come processata
                const notificationKey = `${user.id}_${booking.date}_${booking.time}`;
                this.processedNotifications.add(notificationKey);
              }
            }
          });
        });

        // Salva le notifiche processate
        this.saveProcessedNotifications();
      },
      error: (error) => {
        console.error('Errore nella ricreazione delle notifiche:', error);
      }
    });
  }
}

