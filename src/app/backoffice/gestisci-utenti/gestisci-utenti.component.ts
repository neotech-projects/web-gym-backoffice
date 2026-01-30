import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from './users.service';
import { User } from '../../shared/models/user-data.interface';

declare var bootstrap: any;

@Component({
  selector: 'app-gestisci-utenti',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gestisci-utenti.component.html',
  styleUrl: './gestisci-utenti.component.css'
})
export class GestisciUtentiComponent implements OnInit, AfterViewInit {
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  
  filterCognome: string = '';
  filterSocieta: string = '';
  filterMatricola: string = '';

  // Modifica utente
  editUserId: number | string = '';
  editFirstName: string = '';
  editLastName: string = '';
  editEmail: string = '';
  editPhone: string = '';
  editBirthdate: string = '';
  editGender: string = '';
  editCompany: string = '';
  editOtherCompany: string = '';
  editShowOtherCompany: boolean = false;
  editMatricola: string = '';
  editUserCode: string = '';
  editNewPassword: string = '';
  editConfirmPassword: string = '';
  editShowPassword: boolean = false;
  editShowConfirmPassword: boolean = false;
  selectedUserName: string = '';
  selectedUserHistory: { date: string; time: string; hasAccess: boolean }[] = [];

  constructor(
    private router: Router,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.setupMobileMenu();
  }

  ngAfterViewInit() {
    // Nothing needed here - using Angular bindings
  }

  onEditCompanyChange() {
    this.editShowOtherCompany = this.editCompany === 'Altra';
    if (!this.editShowOtherCompany) {
      this.editOtherCompany = '';
    }
  }

  loadUsers() {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filteredUsers = [...this.allUsers];
      },
      error: (error) => {
        console.error('Errore nel caricamento degli utenti:', error);
        this.allUsers = [];
        this.filteredUsers = [];
      }
    });
  }

  applyFilters() {
    this.filteredUsers = this.allUsers.filter(user => {
      const cognomeMatch = !this.filterCognome || 
        `${user.firstName} ${user.lastName}`.toUpperCase().includes(this.filterCognome.toUpperCase());
      const societaMatch = !this.filterSocieta || 
        user.company.toUpperCase().includes(this.filterSocieta.toUpperCase());
      const matricolaMatch = !this.filterMatricola || 
        user.matricola.toUpperCase().includes(this.filterMatricola.toUpperCase());
      
      return cognomeMatch && societaMatch && matricolaMatch;
    });
  }

  clearFilters() {
    this.filterCognome = '';
    this.filterSocieta = '';
    this.filterMatricola = '';
    this.applyFilters();
  }

  viewUserDetails(userId: number | string) {
    const user = this.allUsers.find(u => u.id.toString() === userId.toString());
    if (!user) return;

    const detailName = document.getElementById('detailName');
    const detailEmail = document.getElementById('detailEmail');
    const detailPhone = document.getElementById('detailPhone');
    const detailUserCode = document.getElementById('detailUserCode');
    const detailMatricola = document.getElementById('detailMatricola');
    const detailCompany = document.getElementById('detailCompany');
    const detailBirthdate = document.getElementById('detailBirthdate');
    const detailGender = document.getElementById('detailGender');

    if (detailName) detailName.textContent = `${user.firstName} ${user.lastName}`;
    if (detailEmail) detailEmail.textContent = user.email;
    if (detailPhone) detailPhone.textContent = user.phone;
    if (detailUserCode) detailUserCode.textContent = user.userCode || 'N/A';
    if (detailMatricola) detailMatricola.textContent = user.matricola || '-';
    if (detailCompany) detailCompany.textContent = user.company;
    if (detailBirthdate) detailBirthdate.textContent = user.birthdateDisplay || user.birthdate;
    if (detailGender) detailGender.textContent = user.gender;

    const modalElement = document.getElementById('userDetailsModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  viewUserHistory(userId: number | string) {
    const user = this.allUsers.find(u => u.id.toString() === userId.toString());
    if (!user) return;

    this.selectedUserName = `${user.firstName} ${user.lastName}`;
    this.selectedUserHistory = user.bookingHistory ? [...user.bookingHistory] : [];

    const modalElement = document.getElementById('userHistoryModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  editUser(userId: number | string) {
    const user = this.allUsers.find(u => u.id.toString() === userId.toString());
    if (!user) return;

    this.editUserId = user.id;
    this.editFirstName = user.firstName;
    this.editLastName = user.lastName;
    this.editEmail = user.email;
    this.editPhone = user.phone;
    this.editBirthdate = user.birthdate;
    this.editGender = user.gender;
    this.editMatricola = user.matricola || '';
    this.editUserCode = user.userCode || 'N/A';
    this.editNewPassword = '';
    this.editConfirmPassword = '';

    // Gestisci il caso "Altra società"
    const predefinedCompanies = ['Acme Corporation', 'TechSolutions S.r.l.', 'Global Industries', 'Innovation Labs', 'Digital Services'];
    if (!predefinedCompanies.includes(user.company)) {
      this.editCompany = 'Altra';
      this.editOtherCompany = user.company;
      this.editShowOtherCompany = true;
    } else {
      this.editCompany = user.company;
      this.editOtherCompany = '';
      this.editShowOtherCompany = false;
    }

    const modalElement = document.getElementById('editUserModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  saveUserChanges() {
    let finalCompany = this.editCompany;
    if (this.editCompany === 'Altra') {
      finalCompany = this.editOtherCompany;
    }

    // Validazione base
    if (!this.editFirstName || !this.editLastName || !this.editEmail || !this.editPhone || 
        !this.editBirthdate || !this.editGender || !finalCompany || !this.editMatricola) {
      alert('Per favore compila tutti i campi obbligatori!');
      return;
    }

    // Validazione password (solo se è stata inserita)
    if (this.editNewPassword || this.editConfirmPassword) {
      if (!this.editNewPassword || !this.editConfirmPassword) {
        alert('Per modificare la password, compila entrambi i campi!');
        return;
      }
      if (this.editNewPassword !== this.editConfirmPassword) {
        alert('Le password non corrispondono!');
        return;
      }
      if (this.editNewPassword.length < 8) {
        alert('La password deve essere di almeno 8 caratteri!');
        return;
      }
    }

    // Prepara i dati per l'aggiornamento
    const userUpdate: Partial<User> = {
      firstName: this.editFirstName,
      lastName: this.editLastName,
      email: this.editEmail,
      phone: this.editPhone,
      birthdate: this.editBirthdate,
      gender: this.editGender,
      company: finalCompany,
      matricola: this.editMatricola
    };

    if (this.editNewPassword) {
      userUpdate.password = this.editNewPassword;
    }

    // Aggiorna l'utente tramite il servizio
    this.usersService.updateUser(this.editUserId, userUpdate).subscribe({
      next: (updatedUser) => {
        // Aggiorna la lista locale
        const userIndex = this.allUsers.findIndex(u => u.id.toString() === this.editUserId.toString());
        if (userIndex !== -1) {
          this.allUsers[userIndex] = updatedUser;
        } else {
          // Se non trovato, ricarica la lista
          this.loadUsers();
        }

        this.applyFilters();

        let successMessage = `✓ Utente aggiornato con successo!\n\nNome: ${this.editFirstName} ${this.editLastName}\nEmail: ${this.editEmail}\nMatricola: ${this.editMatricola}\nSocietà: ${finalCompany}`;
        if (this.editNewPassword) {
          successMessage += `\n\n✓ Password aggiornata con successo!`;
        }
        alert(successMessage);

        // Chiudi la modale
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) {
            modal.hide();
          }
        }
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento dell\'utente:', error);
        alert('Errore nell\'aggiornamento dell\'utente. Riprova più tardi.');
      }
    });
  }

  deleteUser(userId: number | string) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?\n\nQuesta azione non può essere annullata.')) {
      return;
    }

    const idToDelete = userId.toString();
    const userToDelete = this.allUsers.find(u => u.id.toString() === idToDelete);
    
    if (!userToDelete) {
      alert('Errore: utente non trovato!');
      return;
    }

    // Elimina l'utente tramite il servizio
    this.usersService.deleteUser(userId).subscribe({
      next: (success) => {
        if (success) {
          // Rimuovi dalla lista locale
          this.allUsers = this.allUsers.filter(u => u.id.toString() !== idToDelete);
          this.applyFilters();
          alert('Utente eliminato con successo!');
        } else {
          alert('Errore: impossibile eliminare l\'utente!');
        }
      },
      error: (error) => {
        console.error('Errore nell\'eliminazione dell\'utente:', error);
        alert('Errore nell\'eliminazione dell\'utente. Riprova più tardi.');
      }
    });
  }

  togglePassword(fieldId: string) {
    if (fieldId === 'editNewPassword') {
      this.editShowPassword = !this.editShowPassword;
    } else if (fieldId === 'editConfirmPassword') {
      this.editShowConfirmPassword = !this.editShowConfirmPassword;
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  get currentYear(): number {
    return new Date().getFullYear();
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

  /**
   * Calcola lo stato del semaforo basandosi sullo storico prenotazioni
   * @param user L'utente di cui calcolare lo stato
   * @returns 'green' | 'orange' | 'red'
   */
  getTrafficLightStatus(user: User): 'green' | 'orange' | 'red' {
    if (!user.bookingHistory || user.bookingHistory.length === 0) {
      return 'green'; // Se non ci sono prenotazioni, consideriamo verde
    }

    // Conta quante volte ha saltato l'accesso (hasAccess = false)
    const missedAccesses = user.bookingHistory.filter(booking => !booking.hasAccess).length;

    if (missedAccesses === 0) {
      return 'green'; // Mai saltato
    } else if (missedAccesses >= 3) {
      return 'red'; // 3 o più volte saltato
    } else {
      return 'orange'; // Almeno una volta ma meno di 3
    }
  }
}
