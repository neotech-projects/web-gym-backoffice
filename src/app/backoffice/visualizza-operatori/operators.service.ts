import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Operator, UtenteBackend } from '../../shared/models/operator-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperatorsService {
  // Come dashboard: environment.apiUrl + path (/api/operatori)
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/operatori` : '/api/operatori';
  }

  constructor(private http: HttpClient) {}

  /**
   * Recuperaa la lista degli operatori da ms-gym-backoffice (GET /api/operatori).
   * Il backend restituisce List<Utente> = array senza wrapper.
   * In caso di errore HTTP l'errore viene propagato (nessun fallback a JSON locali).
   */
  getOperators(): Observable<Operator[]> {
    return this.http.get<UtenteBackend[]>(this.API_URL, {
      headers: { Accept: 'application/json' }
    }).pipe(
      map((list) => (list || []).map((u) => this.mapUtenteToOperator(u))),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  /** Mappa il DTO Utente del backend nel modello Operator usato dalla UI */
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
      role: u.tipoUtente ?? 'OPERATORE',
      status: u.stato ?? '',
      registrationDate: u.creato,
      societaId: u.societaId,
      societaNome: u.societaNome,
      matricola: u.matricola
    };
  }

  /** Mappa Operator (UI) in UtenteBackend per POST/PUT */
  private mapOperatorToUtente(o: Partial<Operator>): UtenteBackend {
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
      password: o.password
    };
  }

  /**
   * Crea un nuovo operatore (POST /api/operatori). Body in formato Utente; risposta Utente.
   */
  createOperator(operator: Partial<Operator>): Observable<Operator> {
    const body = this.mapOperatorToUtente(operator);
    return this.http.post<UtenteBackend>(this.API_URL, body).pipe(
      map((created) => this.mapUtenteToOperator(created)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  /**
   * Aggiorna un operatore (PUT /api/operatori/{id}). Body in formato Utente; risposta Utente.
   */
  updateOperator(operatorId: number | string, operator: Partial<Operator>): Observable<Operator> {
    const body = this.mapOperatorToUtente(operator);
    return this.http.put<UtenteBackend>(`${this.API_URL}/${operatorId}`, body).pipe(
      map((updated) => this.mapUtenteToOperator(updated)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  /**
   * Elimina un operatore (DELETE /api/operatori/{id}). Backend restituisce 204 No Content.
   */
  deleteOperator(operatorId: number | string): Observable<boolean> {
    return this.http.delete<void>(`${this.API_URL}/${operatorId}`, { observe: 'response' }).pipe(
      map((response) => response.status >= 200 && response.status < 300),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
