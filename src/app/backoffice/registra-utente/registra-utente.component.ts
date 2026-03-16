import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../gestisci-utenti/users.service';
import { User } from '../../shared/models/user-data.interface';

@Component({
  selector: 'app-registra-utente',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './registra-utente.component.html',
  styleUrl: './registra-utente.component.css'
})
export class RegistraUtenteComponent implements OnInit, AfterViewInit {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  phone: string = '';
  birthdate: string = '';
  gender: string = '';
  company: string = '';
  otherCompany: string = '';
  password: string = '';
  confirmPassword: string = '';
  showOtherCompany: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isSubmitting: boolean = false;

  constructor(
    private router: Router,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    // Assicura che il form sia sempre vuoto all'inizializzazione
    this.resetForm();
    // Setup menu mobile
    this.setupMobileMenu();
  }

  ngAfterViewInit() {
    // Assicura che il form sia vuoto anche dopo il rendering della vista
    // Questo previene eventuali problemi di cache o dati residui
    setTimeout(() => {
      this.resetForm();
      // Forza il reset anche degli elementi DOM per prevenire autocompletamento del browser
      this.forceResetFormFields();
    }, 100);
  }

  private forceResetFormFields() {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    if (emailInput) {
      emailInput.value = '';
      emailInput.setAttribute('value', '');
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.setAttribute('value', '');
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.value = '';
      confirmPasswordInput.setAttribute('value', '');
    }
  }

  onCompanyChange() {
    this.showOtherCompany = this.company === 'Altra';
  }

  /**
   * Legge gli utenti da localStorage normalizzando il campo storico certificatoMedico in dichiarazioneManleva.
   */
  private getRegisteredUsersNormalized(): any[] {
    const raw = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    return raw.map((u: any) => {
      const { certificatoMedico, ...rest } = u;
      return { ...rest, dichiarazioneManleva: u.dichiarazioneManleva ?? certificatoMedico };
    });
  }

  /**
   * Genera una password casuale che rispetta i requisiti: min 8 caratteri, almeno una maiuscola, una minuscola e un numero.
   */
  generatePassword(): string {
    const minuscole = 'abcdefghijklmnopqrstuvwxyz';
    const maiuscole = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeri = '0123456789';
    const tutti = minuscole + maiuscole + numeri;
    const len = 12;
    let pwd = '';
    pwd += minuscole.charAt(Math.floor(Math.random() * minuscole.length));
    pwd += maiuscole.charAt(Math.floor(Math.random() * maiuscole.length));
    pwd += numeri.charAt(Math.floor(Math.random() * numeri.length));
    for (let i = pwd.length; i < len; i++) {
      pwd += tutti.charAt(Math.floor(Math.random() * tutti.length));
    }
    // Mescola i caratteri
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
  }

  generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 15; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existingUsers = this.getRegisteredUsersNormalized();
    const existingCodes = existingUsers.map((u: any) => u.userCode);
    
    while (existingCodes.includes(code)) {
      code = '';
      for (let i = 0; i < 15; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return code;
  }

  togglePassword(fieldId: string) {
    if (fieldId === 'password') {
      this.showPassword = !this.showPassword;
    } else if (fieldId === 'confirmPassword') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  regeneratePassword() {
    this.password = this.generatePassword();
    this.confirmPassword = this.password;
  }

  copyPasswordToClipboard() {
    if (!this.password) return;
    navigator.clipboard.writeText(this.password).then(() => {
      alert('Password copiata negli appunti.');
    }).catch(() => {
      alert('Impossibile copiare la password.');
    });
  }

  resetForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phone = '';
    this.birthdate = '';
    this.gender = '';
    this.company = '';
    this.otherCompany = '';
    this.password = '';
    this.confirmPassword = '';
    this.showOtherCompany = false;
  }

  onSubmit() {
    if (this.isSubmitting) return;

    if (this.password !== this.confirmPassword) {
      alert('Le password non corrispondono!');
      return;
    }

    if (this.password.length < 8) {
      alert('La password deve essere di almeno 8 caratteri!');
      return;
    }

    let finalCompany = this.company;
    if (this.company === 'Altra') {
      finalCompany = this.otherCompany;
    }

    const newUser: User = {
      id: 0,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      birthdate: this.birthdate,
      gender: this.gender,
      company: finalCompany ?? '',
      userCode: 'ISCRITTO',
      matricola: '',
      status: 'Attivo',
      password: this.password
    };

    this.isSubmitting = true;
    this.usersService.createUser(newUser).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        const message = `✓ Utente registrato con successo!\n\nNome: ${this.firstName} ${this.lastName}\nEmail: ${this.email}\nSocietà: ${finalCompany}\n\nPassword (da comunicare all'utente):\n${this.password}\n\nVuoi visualizzare la lista utenti?`;
        if (confirm(message)) {
          this.router.navigate(['/backoffice/gestisci-utenti']);
        } else {
          this.resetForm();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Errore registrazione utente:', err);
        const msg = err?.error?.message || (err?.status === 409 || err?.status === 400)
          ? 'Questa email è già registrata.'
          : 'Errore durante la registrazione. Riprova più tardi.';
        alert(msg);
      }
    });
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

}
