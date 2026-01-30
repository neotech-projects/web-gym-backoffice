import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OperatorsService } from '../visualizza-operatori/operators.service';
import { AuthService } from '../../shared/services/auth.service';
import { Operator } from '../../shared/models/operator-data.interface';

@Component({
  selector: 'app-registra-operatore',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './registra-operatore.component.html',
  styleUrl: './registra-operatore.component.css'
})
export class RegistraOperatoreComponent implements OnInit {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  phone: string = '';
  birthdate: string = '';
  gender: string = '';
  role: string = '';

  constructor(
    private router: Router,
    private operatorsService: OperatorsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Verifica che l'utente sia autenticato
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Verifica che l'utente sia admin - controllo rigoroso
    if (!this.authService.isAdmin()) {
      alert('Accesso negato. Solo gli amministratori possono registrare nuovi operatori.');
      this.router.navigate(['/backoffice/dashboard']);
      return;
    }
  }

  onSubmit() {
    // Validazione
    if (!this.firstName || !this.lastName || !this.email || !this.phone || 
        !this.birthdate || !this.gender || !this.role) {
      alert('Per favore compila tutti i campi obbligatori!');
      return;
    }

    // Crea oggetto operatore
    const newOperator: Partial<Operator> = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      birthdate: this.birthdate,
      gender: this.gender,
      role: this.role,
      status: 'Attivo',
      registrationDate: new Date().toISOString().split('T')[0]
    };

    // Salva tramite il servizio
    this.operatorsService.createOperator(newOperator).subscribe({
      next: (operator) => {
        const message = `✓ Operatore registrato con successo!\n\nNome: ${this.firstName} ${this.lastName}\nEmail: ${this.email}\nRuolo: ${this.role}\n\nVuoi visualizzare la lista operatori?`;
        
        if (confirm(message)) {
          this.router.navigate(['/backoffice/visualizza-operatori']);
        } else {
          this.resetForm();
        }
      },
      error: (error) => {
        console.error('Errore nella registrazione dell\'operatore:', error);
        alert('Errore nella registrazione dell\'operatore. Riprova più tardi.');
      }
    });
  }

  resetForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phone = '';
    this.birthdate = '';
    this.gender = '';
    this.role = '';
  }

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
}
