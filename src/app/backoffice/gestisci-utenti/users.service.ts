import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, UtenteBackend } from '../../shared/models/user-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/utenti` : '/api/utenti';
  }

  constructor(private http: HttpClient) {}

  /** Operatore o Admin (come login backoffice); non sono "iscritti" in questa lista. */
  private isStaffTipo(tipo: string | undefined | null): boolean {
    if (tipo == null || String(tipo).trim() === '') return false;
    const t = String(tipo).trim().toLowerCase();
    return t === 'operatore' || t === 'admin';
  }

  /** Lista gestione utenti: solo iscritti (esclude staff anche se l'API non è filtrata). */
  private filterListaIscritti(users: User[]): User[] {
    return users.filter((u) => {
      const ruolo = u.tipoUtente ?? u.userCode;
      return !this.isStaffTipo(ruolo);
    });
  }

  private mapUtenteToUser(u: UtenteBackend): User {
    const birthdate = u.dataNascita ? (typeof u.dataNascita === 'string' ? u.dataNascita : '') : '';
    const tipoUtente = u.tipoUtente;
    return {
      id: u.id ?? 0,
      firstName: u.nome ?? '',
      lastName: u.cognome ?? '',
      email: u.email ?? '',
      phone: u.telefono ?? '',
      company: u.societaNome ?? '',
      birthdate,
      birthdateDisplay: birthdate ? new Date(birthdate).toLocaleDateString('it-IT') : undefined,
      gender: u.sesso ?? '',
      matricola: u.matricola ?? '',
      tipoUtente,
      userCode: tipoUtente ?? u.matricola ?? '',
      status: u.stato ?? '',
      registrationDate: u.creato,
      societaId: u.societaId
    };
  }

  private mapUserToUtente(user: Partial<User>): UtenteBackend {
    const body: UtenteBackend = {
      id: typeof user.id === 'number' ? user.id : undefined,
      nome: user.firstName ?? '',
      cognome: user.lastName ?? '',
      email: user.email ?? '',
      telefono: user.phone ?? undefined,
      dataNascita: user.birthdate || undefined,
      sesso: user.gender || undefined,
      tipoUtente: (user.tipoUtente ?? user.userCode) || undefined,
      stato: user.status || undefined,
      societaId: user.societaId,
      matricola: user.matricola,
      password: user.password
    };
    if (user.company != null && user.company.trim() !== '') {
      body.societaNome = user.company.trim();
    }
    return body;
  }

  getSocieta(): Observable<string[]> {
    const base = environment.apiUrl;
    const url = base ? `${base}/api/societa` : '/api/societa';
    return this.http.get<{ nome: string }[]>(url).pipe(
      map((list) => (list || []).map((s) => s.nome).filter(Boolean)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<UtenteBackend[]>(this.API_URL, {
      headers: { Accept: 'application/json' }
    }).pipe(
      map((list) => {
        const mapped = (list || []).map((u) => this.mapUtenteToUser(u));
        return this.filterListaIscritti(mapped);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  createUser(user: User): Observable<User> {
    const body = this.mapUserToUtente(user);
    return this.http.post<UtenteBackend>(this.API_URL, body).pipe(
      map((created) => this.mapUtenteToUser(created)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  updateUser(userId: number | string, user: Partial<User>): Observable<User> {
    const body = this.mapUserToUtente(user);
    return this.http.put<UtenteBackend>(`${this.API_URL}/${userId}`, body).pipe(
      map((updated) => this.mapUtenteToUser(updated)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  deleteUser(userId: number | string): Observable<boolean> {
    return this.http.delete<void>(`${this.API_URL}/${userId}`, { observe: 'response' }).pipe(
      map((response) => response.status >= 200 && response.status < 300),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
