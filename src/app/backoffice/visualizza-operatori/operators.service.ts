import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Operator, UtenteBackend } from '../../shared/models/operator-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperatorsService {
  /** Lista: {@code GET /api/utenti?staff=true} (path unico per il gateway). */
  private get utentiBaseUrl(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/utenti` : '/api/utenti';
  }

  /**
   * Stessi path degli iscritti ({@code POST|PUT|DELETE /api/utenti}) con {@code staff=true}:
   * il gateway inoltra come le altre chiamate utenti; path tipo {@code /api/operatori} o {@code /api/utenti/operatori} possono dare 404/405.
   */
  private readonly staffQuery = new HttpParams().set('staff', 'true');

  constructor(private http: HttpClient) {}

  getOperators(): Observable<Operator[]> {
    return this.http
      .get<UtenteBackend[]>(this.utentiBaseUrl, {
        params: { staff: 'true' },
        headers: { Accept: 'application/json' }
      })
      .pipe(
        map((list) =>
          (list || [])
            .filter((u) => this.isSoloStaffBackoffice(u.tipoUtente))
            .map((u) => this.mapUtenteToOperator(u))
        ),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
  }

  /** Allineato al backend: solo Operatore/Admin (come la lista iscritti esclude questi tipi). */
  private isSoloStaffBackoffice(tipo: string | undefined): boolean {
    const t = (tipo ?? '').trim().toLowerCase();
    return t === 'operatore' || t === 'admin';
  }

  private mapUtenteToOperator(u: UtenteBackend): Operator {
    const birthdate = u.dataNascita
      ? typeof u.dataNascita === 'string'
        ? u.dataNascita
        : (u.dataNascita as unknown as string)
      : '';
    return {
      id: u.id ?? 0,
      firstName: u.nome ?? '',
      lastName: u.cognome ?? '',
      email: u.email ?? '',
      phone: u.telefono ?? '',
      birthdate,
      birthdateDisplay: birthdate ? new Date(birthdate).toLocaleDateString('it-IT') : undefined,
      gender: u.sesso ?? '',
      role: this.normalizeTipoUtenteDisplay(u.tipoUtente),
      status: u.stato ?? '',
      registrationDate: u.creato,
      societaId: u.societaId,
      societaNome: u.societaNome,
      matricola: u.matricola
    };
  }

  /** Allinea a {@code tipo_utente} sul backend (Operatore / Admin). */
  private normalizeTipoUtenteDisplay(tipo: string | undefined): string {
    const t = (tipo ?? '').trim();
    if (!t) {
      return 'Operatore';
    }
    const lower = t.toLowerCase();
    if (lower === 'admin') {
      return 'Admin';
    }
    if (lower === 'operatore') {
      return 'Operatore';
    }
    return t;
  }

  private mapOperatorToUtente(o: Partial<Operator>): UtenteBackend {
    const ruolo = (o.role ?? '').trim();
    return {
      id: typeof o.id === 'number' ? o.id : undefined,
      nome: o.firstName ?? '',
      cognome: o.lastName ?? '',
      email: o.email ?? '',
      telefono: o.phone ?? undefined,
      dataNascita: o.birthdate || undefined,
      sesso: o.gender || undefined,
      stato: o.status || undefined,
      societaId: o.societaId,
      matricola: o.matricola,
      password: o.password,
      tipoUtente: ruolo || undefined
    };
  }

  createOperator(operator: Partial<Operator>): Observable<Operator> {
    const body = this.mapOperatorToUtente(operator);
    return this.http
      .post<UtenteBackend>(this.utentiBaseUrl, body, { params: this.staffQuery })
      .pipe(
        map((created) => this.mapUtenteToOperator(created)),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
  }

  updateOperator(operatorId: number | string, operator: Partial<Operator>): Observable<Operator> {
    const body = this.mapOperatorToUtente(operator);
    return this.http
      .put<UtenteBackend>(`${this.utentiBaseUrl}/${operatorId}`, body, { params: this.staffQuery })
      .pipe(
        map((updated) => this.mapUtenteToOperator(updated)),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
  }

  deleteOperator(operatorId: number | string): Observable<boolean> {
    return this.http
      .delete<void>(`${this.utentiBaseUrl}/${operatorId}`, {
        params: this.staffQuery,
        observe: 'response'
      })
      .pipe(
        map((response) => response.status >= 200 && response.status < 300),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
  }
}
