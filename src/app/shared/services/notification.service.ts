import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'missed_booking' | 'new_booking' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  userName?: string;
  matricola?: string;
  bookingDate?: string;
  bookingTime?: string;
  trafficLightStatus?: 'green' | 'orange' | 'red';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  constructor() {
    // Carica notifiche da localStorage all'avvio
    this.loadNotifications();
  }

  /**
   * Carica le notifiche da localStorage
   */
  private loadNotifications(): void {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Converti le date da stringa a Date
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notificationsSubject.next([...this.notifications]);
      } catch (e) {
        console.error('Errore nel caricamento delle notifiche:', e);
        this.notifications = [];
      }
    }
  }

  /**
   * Salva le notifiche in localStorage
   */
  private saveNotifications(): void {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  /**
   * Aggiunge una nuova notifica
   */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification); // Aggiungi in cima
    this.notificationsSubject.next([...this.notifications]);
    this.saveNotifications();
  }

  /**
   * Crea una notifica per prenotazione saltata
   * @param missedCount Il numero di prenotazioni saltate fino a questo momento (inclusa questa)
   */
  createMissedBookingNotification(
    userName: string,
    matricola: string,
    bookingDate: string,
    bookingTime: string,
    missedCount: number
  ): void {
    // Determina il tipo e il messaggio in base al numero di prenotazioni saltate
    let type: 'missed_booking' | 'warning' = 'missed_booking';
    let title = '';
    let iconClass = '';

    if (missedCount === 1) {
      // Prima prenotazione saltata
      type = 'missed_booking';
      title = `⚠️ Prenotazione saltata: ${userName}`;
      iconClass = 'bg-warning-subtle text-warning';
    } else if (missedCount === 2) {
      // Seconda prenotazione saltata
      type = 'warning';
      title = `⚠️ Attenzione: ${userName} ha saltato un'altra prenotazione`;
      iconClass = 'bg-warning-subtle text-warning';
    } else if (missedCount >= 3) {
      // Terza o più prenotazioni saltate
      type = 'warning';
      title = `🔴 Allerta: ${userName} ha saltato ${missedCount} prenotazioni`;
      iconClass = 'bg-danger-subtle text-danger';
    }

    const message = `${userName} (Matricola: ${matricola}) non si è presentato alla prenotazione del ${this.formatDate(bookingDate)} alle ${bookingTime}`;

    // Calcola lo stato del semaforo basandosi sul numero di prenotazioni saltate
    let trafficLightStatus: 'green' | 'orange' | 'red' = 'green';
    if (missedCount === 0) {
      trafficLightStatus = 'green';
    } else if (missedCount >= 3) {
      trafficLightStatus = 'red';
    } else {
      trafficLightStatus = 'orange';
    }

    this.addNotification({
      type,
      title,
      message,
      userName,
      matricola,
      bookingDate,
      bookingTime,
      trafficLightStatus
    });
  }

  /**
   * Formatta la data in formato italiano
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Ottiene il numero di notifiche non lette
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notificationsSubject.next([...this.notifications]);
      this.saveNotifications();
    }
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notificationsSubject.next([...this.notifications]);
    this.saveNotifications();
  }

  /**
   * Elimina una notifica
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notificationsSubject.next([...this.notifications]);
    this.saveNotifications();
  }

  /**
   * Elimina tutte le notifiche
   */
  clearAll(): void {
    this.notifications = [];
    this.notificationsSubject.next([]);
    this.saveNotifications();
  }

  /**
   * Ottiene tutte le notifiche
   */
  getAllNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Formatta il tempo trascorso (es. "2 ore fa")
   */
  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Adesso';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minuto' : 'minuti'} fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'} fa`;
    }
  }

  /**
   * Ottiene la classe CSS per l'icona in base al tipo di notifica
   */
  getIconClass(notification: Notification): string {
    switch (notification.type) {
      case 'missed_booking':
        return 'bg-warning-subtle text-warning';
      case 'warning':
        if (notification.trafficLightStatus === 'red') {
          return 'bg-danger-subtle text-danger';
        }
        return 'bg-warning-subtle text-warning';
      case 'new_booking':
        return 'bg-info-subtle text-info';
      case 'info':
        return 'bg-primary-subtle text-primary';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  /**
   * Ottiene l'icona in base al tipo di notifica
   */
  getIcon(notification: Notification): string {
    switch (notification.type) {
      case 'missed_booking':
      case 'warning':
        return 'bx-error-circle';
      case 'new_booking':
        return 'bx-time';
      case 'info':
        return 'bx-info-circle';
      default:
        return 'bx-bell';
    }
  }
}
