import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  bookingsCount: number = 0;
  workoutsCount: number = 0;
  currentPresencesCount: number = 0;
  currentPresenceBadge: string = 'In tempo reale';
  currentPresenceBadgeClass: string = 'badge bg-success-subtle text-success';
  isLoading: boolean = true;
  private intervalId?: any;
  private subscriptions: Subscription = new Subscription();

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboardData();
    // Aggiorna le presenze ogni 30 secondi
    this.intervalId = setInterval(() => this.updateCurrentPresences(), 30000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.subscriptions.unsubscribe();
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Carica tutti i dati della dashboard dal microservizio
   */
  loadDashboardData() {
    this.isLoading = true;
    const sub = this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.bookingsCount = data.weeklyBookings;
        this.workoutsCount = data.monthlyPresences;
        this.currentPresencesCount = data.currentPresences;
        this.updatePresenceBadge();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento dei dati della dashboard:', error);
        this.isLoading = false;
        // Mantiene i valori di default (0) in caso di errore
      }
    });
    this.subscriptions.add(sub);
  }

  /**
   * Aggiorna solo le presenze attuali (chiamata periodica)
   */
  updateCurrentPresences() {
    const sub = this.dashboardService.getCurrentPresences().subscribe({
      next: (count) => {
        this.currentPresencesCount = count;
        this.updatePresenceBadge();
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento delle presenze:', error);
      }
    });
    this.subscriptions.add(sub);
  }

  /**
   * Aggiorna il badge delle presenze in base al conteggio
   */
  private updatePresenceBadge() {
    if (this.currentPresencesCount > 0) {
      this.currentPresenceBadge = 'In tempo reale';
      this.currentPresenceBadgeClass = 'badge bg-success-subtle text-success';
    } else {
      this.currentPresenceBadge = 'Nessuna presenza';
      this.currentPresenceBadgeClass = 'badge bg-secondary-subtle text-secondary';
    }
  }

  viewCurrentPresences(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    if (this.currentPresencesCount === 0) {
      alert('Attualmente non ci sono persone in palestra.');
    } else {
      alert(`Attualmente ci sono ${this.currentPresencesCount} ${this.currentPresencesCount === 1 ? 'persona' : 'persone'} in palestra.\n\nIn produzione, qui verrebbe mostrata una lista dettagliata degli utenti presenti.`);
    }
  }

  openDoor() {
    // TODO: In produzione, chiamata API
    const btn = document.getElementById('openDoorBtn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.setAttribute('disabled', 'true');
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Apertura...';
      
      setTimeout(() => {
        alert('✓ Porta aperta con successo!');
        btn.removeAttribute('disabled');
        btn.innerHTML = originalText;
      }, 1500);
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
