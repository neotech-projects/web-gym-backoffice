import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OperatorProfile } from '../../shared/models/operator-profile-data.interface';
import { UtenteBackend } from '../../shared/models/operator-data.interface';
import { OperatorsService } from '../visualizza-operatori/operators.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperatorProfileService {
  private get utentiApiBase(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/utenti` : '/api/utenti';
  }

  private readonly staffParams = new HttpParams().set('staff', 'true');

  constructor(
    private http: HttpClient,
    private operatorsService: OperatorsService
  ) {}

  getProfile(operatorId?: number | string): Observable<OperatorProfile> {
    if (operatorId) {
      const params = this.staffParams.set('utenteId', String(operatorId)).set('profilo', 'true');
      return this.http.get<UtenteBackend | UtenteBackend[]>(this.utentiApiBase, { params }).pipe(
        map((raw) => {
          const u = this.extractUtenteFromProfiloResponse(raw, operatorId);
          return this.mapUtenteToProfile(u);
        }),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
    }

    return this.operatorsService.getOperators().pipe(
      map((operators) => {
        if (operators.length === 0) throw new Error('Nessun operatore trovato');
        const op = operators[0];
        return {
          id: op.id,
          firstName: op.firstName,
          lastName: op.lastName,
          email: op.email,
          phone: op.phone,
          birthdate: op.birthdate,
          birthdateDisplay: op.birthdateDisplay,
          gender: op.gender,
          role: op.role ?? 'Operatore'
        };
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  private extractUtenteFromProfiloResponse(
    raw: UtenteBackend | UtenteBackend[],
    operatorId: number | string
  ): UtenteBackend {
    if (Array.isArray(raw)) {
      const found = raw.find((x) => x != null && String(x.id) === String(operatorId));
      if (!found) {
        throw new Error('Profilo non trovato nella lista');
      }
      return found;
    }
    return raw;
  }

  private normalizeDataNascita(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    return '';
  }

  private mapUtenteToProfile(u: UtenteBackend): OperatorProfile {
    const birthdate = this.normalizeDataNascita(u.dataNascita as unknown);
    return {
      id: u.id ?? 0,
      firstName: u.nome ?? '',
      lastName: u.cognome ?? '',
      email: u.email ?? '',
      phone: u.telefono ?? '',
      birthdate,
      birthdateDisplay: birthdate ? new Date(birthdate).toLocaleDateString('it-IT') : undefined,
      gender: u.sesso ?? '',
      role: u.tipoUtente ?? 'OPERATORE'
    };
  }

  updateProfile(profile: Partial<OperatorProfile>): Observable<OperatorProfile> {
    const utenteId = profile?.id;
    if (utenteId == null) {
      return throwError(() => new Error('ID operatore obbligatorio per aggiornare il profilo'));
    }

    const body = { email: profile.email, telefono: profile.phone };
    const params = this.staffParams.set('utenteId', String(utenteId)).set('profilo', 'true');
    return this.http.put<UtenteBackend>(this.utentiApiBase, body, { params }).pipe(
      map((updated) => this.mapUtenteToProfile(updated)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  changePassword(operatorId: number | string, oldPassword: string, newPassword: string): Observable<boolean> {
    const body = { vecchiaPassword: oldPassword, nuovaPassword: newPassword };
    const params = this.staffParams.set('utenteId', String(operatorId)).set('cambioPwd', 'true');
    return this.http.post<void>(this.utentiApiBase, body, { params, observe: 'response' }).pipe(
      map((response) => response.status >= 200 && response.status < 300),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
