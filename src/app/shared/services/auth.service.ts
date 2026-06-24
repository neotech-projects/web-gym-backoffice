import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Risposta dell'API di login del backoffice */
export interface LoginApiResponse {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  token: string;
  tipoUtente?: string;
}

export interface AuthUser {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'current_user';
  private readonly TOKEN_COOKIE_KEY = 'authToken';
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private get loginUrl(): string {
    return `${environment.apiUrl}/api/auth/login`;
  }

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  /**
   * Effettua il login: chiama l'API backoffice e salva id, cognome, token (e nome, email) in sessionStorage.
   */
  login(email: string, password: string): Observable<boolean> {
    return this.http.post<LoginApiResponse>(this.loginUrl, { email, password }).pipe(
      map((res) => {
        const user: AuthUser = {
          id: res.id,
          firstName: res.nome ?? '',
          lastName: res.cognome ?? '',
          email: res.email ?? '',
          role: (res.tipoUtente && res.tipoUtente.trim()) ? res.tipoUtente.trim() : 'Operatore',
          token: res.token ?? ''
        };
        this.setCurrentUser(user);
        return true;
      }),
      catchError((err) => {
        if (err?.status === 403) return throwError(() => err);
        return of(false);
      })
    );
  }

  /**
   * Effettua il logout
   */
  logout(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.clearSessionCookie();
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
   * Verifica se l'utente è admin (case-insensitive: Admin, ADMIN, admin).
   */
  isAdmin(): boolean {
    const role = (this.currentUserSubject.value?.role ?? '').trim().toLowerCase();
    return role === 'admin';
  }

  /**
   * Verifica se l'utente è operatore (case-insensitive: Operatore, OPERATORE, operatore).
   */
  isOperator(): boolean {
    const role = (this.currentUserSubject.value?.role ?? '').trim().toLowerCase();
    return role === 'operatore';
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
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.setSessionCookie(user.token);
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(user);
  }

  /**
   * Recupera l'utente salvato in sessionStorage (id, cognome, token, ecc.).
   * Se manca il token (login vecchio) ritorna null.
   */
  private getStoredUser(): AuthUser | null {
    localStorage.removeItem(this.STORAGE_KEY);
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as AuthUser;
      if (!parsed?.token) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Cookie di sessione (senza scadenza): si cancella alla chiusura del browser. */
  private setSessionCookie(token: string): void {
    document.cookie = `${this.TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; SameSite=Strict`;
  }

  private clearSessionCookie(): void {
    document.cookie = `${this.TOKEN_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
  }
}
