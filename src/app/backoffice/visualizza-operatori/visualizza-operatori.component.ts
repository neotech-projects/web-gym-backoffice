import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OperatorsService } from './operators.service';
import { Operator } from '../../shared/models/operator-data.interface';

declare var bootstrap: any;

@Component({
  selector: 'app-visualizza-operatori',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './visualizza-operatori.component.html',
  styleUrl: './visualizza-operatori.component.css'
})
export class VisualizzaOperatoriComponent implements OnInit, AfterViewInit {
  allOperators: Operator[] = [];
  filteredOperators: Operator[] = [];
  selectedOperator: Operator | null = null;
  
  filter = {
    lastName: '',
    email: '',
    phone: ''
  };

  editOperatorData: any = {
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    gender: '',
    newPassword: '',
    confirmPassword: ''
  };

  showEditPassword = false;
  showEditConfirmPassword = false;

  constructor(private operatorsService: OperatorsService) {}

  ngOnInit() {
    this.loadOperators();
    this.setupMobileMenu();
  }

  ngAfterViewInit() {
    this.setupModalHandlers();
    this.initializeDropdowns();
  }

  private initializeDropdowns() {
    // Inizializza tutti i dropdown di Bootstrap dopo che la vista è stata renderizzata
    setTimeout(() => {
      const dropdownButtons = document.querySelectorAll('[data-bs-toggle="dropdown"]');
      dropdownButtons.forEach(button => {
        const BootstrapDropdown = (window as any).bootstrap?.Dropdown;
        if (BootstrapDropdown && button instanceof HTMLElement) {
          // Inizializza il dropdown se non è già inizializzato
          if (!BootstrapDropdown.getInstance(button)) {
            new BootstrapDropdown(button);
          }
        }
      });
    }, 100);
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  loadOperators() {
    this.operatorsService.getOperators().subscribe({
      next: (operators) => {
        this.allOperators = operators;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Errore nel caricamento degli operatori:', error);
        this.allOperators = [];
        this.applyFilters();
      }
    });
  }

  applyFilters() {
    this.filteredOperators = this.allOperators.filter(operator => {
      const matchLastName = operator.lastName.toUpperCase().includes(this.filter.lastName.toUpperCase());
      const matchEmail = operator.email.toUpperCase().includes(this.filter.email.toUpperCase());
      const matchPhone = operator.phone.replace(/\s/g, '').includes(this.filter.phone.replace(/\s/g, ''));
      return matchLastName && matchEmail && matchPhone;
    });
    // Reinizializza i dropdown dopo che i filtri hanno aggiornato la lista
    setTimeout(() => this.initializeDropdowns(), 50);
  }

  clearFilters() {
    this.filter = {
      lastName: '',
      email: '',
      phone: ''
    };
    this.applyFilters();
  }

  viewOperatorDetails(operatorId: number | string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Chiudi il dropdown
    this.closeDropdown(operatorId);
    
    this.selectedOperator = this.allOperators.find(o => o.id === operatorId) || null;
    if (this.selectedOperator) {
      setTimeout(() => {
        const modalElement = document.getElementById('operatorDetailsModal');
        if (modalElement) {
          const BootstrapModal = (window as any).bootstrap?.Modal;
          if (BootstrapModal) {
            const modal = new BootstrapModal(modalElement);
            modal.show();
          }
        }
      }, 100);
    }
  }

  editOperator(operatorId: number | string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Chiudi il dropdown
    this.closeDropdown(operatorId);
    
    const operator = this.allOperators.find(o => o.id === operatorId);
    if (operator) {
      this.editOperatorData = {
        id: operator.id,
        firstName: operator.firstName,
        lastName: operator.lastName,
        email: operator.email,
        phone: operator.phone,
        birthdate: operator.birthdate,
        gender: operator.gender,
        newPassword: '',
        confirmPassword: ''
      };

      setTimeout(() => {
        const modalElement = document.getElementById('editOperatorModal');
        if (modalElement) {
          const BootstrapModal = (window as any).bootstrap?.Modal;
          if (BootstrapModal) {
            const modal = new BootstrapModal(modalElement);
            modal.show();
          }
        }
      }, 100);
    }
  }

  private closeDropdown(operatorId: number | string) {
    const buttonId = `dropdownMenuButton_${operatorId}`;
    const button = document.getElementById(buttonId);
    if (button) {
      const BootstrapDropdown = (window as any).bootstrap?.Dropdown;
      if (BootstrapDropdown) {
        const dropdown = BootstrapDropdown.getInstance(button);
        if (dropdown) {
          dropdown.hide();
        }
      }
      // Rimuovi anche la classe show dal menu
      const dropdownMenu = button.nextElementSibling;
      if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
        dropdownMenu.classList.remove('show');
      }
      button.setAttribute('aria-expanded', 'false');
    }
  }

  saveOperatorChanges() {
    if (this.editOperatorData.newPassword || this.editOperatorData.confirmPassword) {
      if (this.editOperatorData.newPassword !== this.editOperatorData.confirmPassword) {
        alert('Le nuove password non corrispondono!');
        return;
      }
      if (this.editOperatorData.newPassword.length < 8) {
        alert('La nuova password deve essere di almeno 8 caratteri!');
        return;
      }
    }

    // Prepara i dati per l'aggiornamento
    const operatorUpdate: Partial<Operator> = {
      firstName: this.editOperatorData.firstName,
      lastName: this.editOperatorData.lastName,
      email: this.editOperatorData.email,
      phone: this.editOperatorData.phone,
      birthdate: this.editOperatorData.birthdate,
      gender: this.editOperatorData.gender
    };

    if (this.editOperatorData.newPassword) {
      operatorUpdate.password = this.editOperatorData.newPassword;
    }

    // Aggiorna l'operatore tramite il servizio
    this.operatorsService.updateOperator(this.editOperatorData.id, operatorUpdate).subscribe({
      next: (updatedOperator) => {
        // Aggiorna la lista locale
        const operatorIndex = this.allOperators.findIndex(o => o.id === this.editOperatorData.id);
        if (operatorIndex !== -1) {
          this.allOperators[operatorIndex] = updatedOperator;
        } else {
          // Se non trovato, ricarica la lista
          this.loadOperators();
        }

        this.applyFilters();
        this.closeModal('editOperatorModal');
        alert('✓ Operatore aggiornato con successo!');
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento dell\'operatore:', error);
        alert('Errore nell\'aggiornamento dell\'operatore. Riprova più tardi.');
      }
    });
  }

  deleteOperator(operatorId: number | string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Chiudi il dropdown
    this.closeDropdown(operatorId);
    
    if (confirm('Sei sicuro di voler eliminare questo operatore?\n\nQuesta azione non può essere annullata.')) {
      // Elimina l'operatore tramite il servizio
      this.operatorsService.deleteOperator(operatorId).subscribe({
        next: (success) => {
          if (success) {
            // Rimuovi dalla lista locale
            this.allOperators = this.allOperators.filter(o => o.id !== operatorId);
            this.applyFilters();
            alert('Operatore eliminato con successo!');
          } else {
            alert('Errore: impossibile eliminare l\'operatore!');
          }
        },
        error: (error) => {
          console.error('Errore nell\'eliminazione dell\'operatore:', error);
          alert('Errore nell\'eliminazione dell\'operatore. Riprova più tardi.');
        }
      });
    }
  }

  togglePasswordVisibility(field: 'editNewPassword' | 'editConfirmPassword') {
    if (field === 'editNewPassword') {
      this.showEditPassword = !this.showEditPassword;
    } else {
      this.showEditConfirmPassword = !this.showEditConfirmPassword;
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const BootstrapModal = (window as any).bootstrap?.Modal;
      if (BootstrapModal) {
        const modal = BootstrapModal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    }
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

  private setupMobileMenu() {
    const hamburger = document.getElementById('topnav-hamburger-icon');
    const verticalOverlay = document.querySelector('.vertical-overlay');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        const width = window.innerWidth;
        if (width <= 767) {
          document.body.classList.toggle('vertical-sidebar-enable');
          if (document.body.classList.contains('vertical-sidebar-enable')) {
            document.documentElement.setAttribute('data-sidebar-size', 'lg');
          }
        }
      }, true);
    }

    if (verticalOverlay) {
      verticalOverlay.addEventListener('click', () => {
        document.body.classList.remove('vertical-sidebar-enable');
      });
    }
  }

  private setupModalHandlers() {
    const modalElements = ['operatorDetailsModal', 'editOperatorModal'];
    modalElements.forEach(modalId => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
          this.cleanupModal();
        });
      }
    });
  }

  private cleanupModal() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    const allModals = document.querySelectorAll('.modal.show');
    allModals.forEach(modal => {
      (modal as HTMLElement).classList.remove('show');
      (modal as HTMLElement).style.display = 'none';
    });
  }
}
