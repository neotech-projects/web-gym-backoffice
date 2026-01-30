import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Operator } from '../models/operator-data.interface';

export interface AuthUser {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'current_user';
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {}

  /**
   * Effettua il login
   */
  login(email: string, password: string): Observable<boolean> {
    // Simula autenticazione - in produzione fare chiamata API
    // Per ora usiamo dati mock hardcoded per test
    const mockOperators: { email: string; password: string; operator: AuthUser }[] = [
      {
        email: 'alessandro.romano@palestra.it',
        password: 'admin123',
        operator: {
          id: 5,
          firstName: 'Alessandro',
          lastName: 'Romano',
          email: 'alessandro.romano@palestra.it',
          role: 'Admin'
        }
      },
      {
        email: 'marco.bianchi@palestra.it',
        password: 'operatore123',
        operator: {
          id: 1,
          firstName: 'Marco',
          lastName: 'Bianchi',
          email: 'marco.bianchi@palestra.it',
          role: 'Operatore'
        }
      },
      {
        email: 'sara.rossi@palestra.it',
        password: 'operatore123',
        operator: {
          id: 2,
          firstName: 'Sara',
          lastName: 'Rossi',
          email: 'sara.rossi@palestra.it',
          role: 'Operatore'
        }
      }
    ];

    const foundOperator = mockOperators.find(
      op => op.email.toLowerCase() === email.toLowerCase() && op.password === password
    );

    if (foundOperator) {
      this.setCurrentUser(foundOperator.operator);
      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    }

    return new Observable(observer => {
      observer.next(false);
      observer.complete();
    });
  }

  /**
   * Effettua il logout
   */
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Verifica se l'utente è autenticato
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Verifica se l'utente è admin
   */
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'Admin';
  }

  /**
   * Verifica se l'utente è operatore
   */
  isOperator(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'Operatore';
  }

  /**
   * Ottiene l'utente corrente
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Imposta l'utente corrente
   */
  private setCurrentUser(user: AuthUser): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Recupera l'utente salvato in localStorage
   */
  private getStoredUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
