import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registrazione',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './registrazione.component.html',
  styleUrl: './registrazione.component.css'
})
export class RegistrazioneComponent {
  nome: string = '';
  cognome: string = '';
  username: string = '';
  email: string = '';
  societa: string = '';
  password: string = '';
  passwordConfirm: string = '';
  acceptTerms: boolean = false;
  showPassword: boolean = false;
  showPasswordConfirm: boolean = false;

  societaList = [
    { value: 'societa1', label: 'Società A' },
    { value: 'societa2', label: 'Società B' },
    { value: 'societa3', label: 'Società C' },
    { value: 'societa4', label: 'Società D' },
    { value: 'societa5', label: 'Società E' }
  ];

  passwordRequirements = {
    length: false,
    lower: false,
    upper: false,
    number: false
  };

  constructor(private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmVisibility() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  onPasswordChange() {
    this.checkPasswordRequirements();
    this.validatePasswordConfirm();
  }

  checkPasswordRequirements() {
    const pass = this.password;
    this.passwordRequirements.length = pass.length >= 8;
    this.passwordRequirements.lower = /[a-z]/.test(pass);
    this.passwordRequirements.upper = /[A-Z]/.test(pass);
    this.passwordRequirements.number = /\d/.test(pass);
  }

  validatePasswordConfirm() {
    // La validazione viene gestita dal template con pattern matching
  }

  onSubmit(form: any) {
    if (form.valid && this.password === this.passwordConfirm) {
      // TODO: Implementare logica di registrazione
      console.log('Registration attempt:', {
        nome: this.nome,
        cognome: this.cognome,
        username: this.username,
        email: this.email,
        societa: this.societa
      });
      this.router.navigate(['/backoffice/dashboard']);
    }
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  get isPasswordValid(): boolean {
    return Object.values(this.passwordRequirements).every(req => req === true);
  }
}
