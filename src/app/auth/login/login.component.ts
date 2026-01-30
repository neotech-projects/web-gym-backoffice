import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    this.errorMessage = '';

    if (!this.username || !this.password) {
      this.errorMessage = 'Inserisci username e password';
      return;
    }

    this.authService.login(this.username, this.password).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/backoffice/dashboard']);
        } else {
          this.errorMessage = 'Credenziali non valide. Verifica email e password.';
        }
      },
      error: () => {
        this.errorMessage = 'Errore durante il login. Riprova più tardi.';
      }
    });
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
