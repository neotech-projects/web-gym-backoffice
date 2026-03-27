import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, UtenteBackend } from '../../shared/models/user-data.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  // Come operatori: environment.apiUrl + path (/api/utenti)
  private get API_URL(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/utenti` : '/api/utenti';
  }

  private readonly MOCK_URL = '/assets/mock/users.json';
  private serverAvailable: boolean = true;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 60000;

  constructor(private http: HttpClient) {}

  /**
   * Verifica se il server è disponibile (con cache per evitare troppe chiamate)
   */
  private isServerAvailable(): boolean {
    const now = Date.now();
    // Se è passato più di CHECK_INTERVAL, aggiorna lo stato
    if (now - this.lastCheck > this.CHECK_INTERVAL) {
      this.lastCheck = now;
    }
    return this.serverAvailable;
  }

  /**
   * Normalizza un utente: migra certificatoMedico → dichiarazioneManleva per retrocompatibilità (mock).
   */
  private normalizeUser(user: any): User {
    const { certificatoMedico, ...rest } = user;
    return {
      ...rest,
      dichiarazioneManleva: user.dichiarazioneManleva ?? certificatoMedico,
      birthdateDisplay: user.birthdate ? new Date(user.birthdate).toLocaleDateString('it-IT') : user.birthdateDisplay
    } as User;
  }

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

  /** Mappa il DTO Utente del backend nel modello User usato dalla UI */
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

  /** Mappa User (UI) in UtenteBackend per POST/PUT.
   * Invia societaNome (company) quando valorizzato, così il backend può creare la società se non esiste. */
  private mapUserToUtente(user: Partial<User>): UtenteBackend {
    const body: UtenteBackend = {
      id: typeof user.id === 'number' ? user.id : undefined,
      nome: user.firstName ?? '',
      cognome: user.lastName ?? '',
      email: user.email ?? '',
      telefono: user.phone ?? undefined,
      dataNascita: user.birthdate || undefined,
      sesso: user.gender || undefined,
      tipoUtente: user.userCode || undefined,
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

  /**
   * Gestisce gli errori di connessione in modo silenzioso quando il fallback funziona
   */
  private handleConnectionError<T>(error: HttpErrorResponse, useMock: () => Observable<T>): Observable<T> {
    // Se è un errore di connessione (status 0) o di parsing (risposta non JSON)
    const isConnectionError = error.status === 0;
    const isParseError = error.message?.includes('parsing') || error.error instanceof ProgressEvent;
    
    if (isConnectionError || isParseError) {
      this.serverAvailable = false;
      // Log solo un messaggio informativo, non l'intero errore
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per altri errori HTTP (404, 500, ecc.), logga normalmente ma usa comunque il mock
    if (error.status && error.status >= 400) {
      this.serverAvailable = false;
      if (this.lastCheck === 0 || Date.now() - this.lastCheck > this.CHECK_INTERVAL) {
        console.info('Microservizio non disponibile, uso dati mock locali');
        this.lastCheck = Date.now();
      }
      return useMock();
    }
    
    // Per errori sconosciuti, logga e usa il mock
    console.warn('Errore nella chiamata al microservizio:', error.message);
    this.serverAvailable = false;
    return useMock();
  }

  /**
   * Recupera la lista degli utenti da ms-gym-backoffice (GET /api/utenti).
   * Il backend restituisce List<Utente> = array senza wrapper.
   */
  getUsers(): Observable<User[]> {
    if (!this.isServerAvailable()) {
      return this.getMockUsers();
    }

    return this.http.get<UtenteBackend[]>(this.API_URL, {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      map(list => {
        this.serverAvailable = true;
        const mapped = (list || []).map(u => this.mapUtenteToUser(u));
        return this.filterListaIscritti(mapped);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.serverAvailable = false;
          return this.getMockUsers();
        }
        return this.handleConnectionError(error, () => this.getMockUsers());
      })
    );
  }

  /**
   * Recupera gli utenti dal mock locale
   */
  private getMockUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.MOCK_URL).pipe(
      map(users =>
        this.filterListaIscritti(users.map(user => this.normalizeUser(user)))
      ),
      catchError(error => {
        console.error('Errore nel caricamento del mock:', error);
        // Fallback a dati di default
        return of([]);
      })
    );
  }

  /**
   * Crea un nuovo utente (POST /api/utenti). Body in formato Utente; risposta Utente.
   */
  createUser(user: User): Observable<User> {
    if (!this.isServerAvailable()) {
      return of({ ...user, id: Date.now() } as User);
    }

    const body = this.mapUserToUtente(user);
    return this.http.post<UtenteBackend>(this.API_URL, body).pipe(
      map(created => {
        this.serverAvailable = true;
        return this.mapUtenteToUser(created);
      }),
      catchError((error: HttpErrorResponse) => {
        // Errore business (email duplicata, validazione): non usare mock, propaga l'errore alla UI
        if (error.status === 409 || error.status === 400) {
          throw error;
        }
        return this.handleConnectionError(error, () =>
          of({ ...user, id: Date.now() } as User)
        );
      })
    );
  }

  /**
   * Aggiorna un utente esistente (PUT /api/utenti/{id}). Body in formato Utente; risposta Utente.
   */
  updateUser(userId: number | string, user: Partial<User>): Observable<User> {
    if (!this.isServerAvailable()) {
      return of({ ...user, id: userId } as User);
    }

    const body = this.mapUserToUtente(user);
    return this.http.put<UtenteBackend>(`${this.API_URL}/${userId}`, body).pipe(
      map(updated => {
        this.serverAvailable = true;
        return this.mapUtenteToUser(updated);
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () =>
          of({ ...user, id: userId } as User)
        );
      })
    );
  }

  /**
   * Elimina un utente (DELETE /api/utenti/{id}). Backend restituisce 204 No Content.
   */
  deleteUser(userId: number | string): Observable<boolean> {
    if (!this.isServerAvailable()) {
      return of(true);
    }

    return this.http.delete<void>(`${this.API_URL}/${userId}`, { observe: 'response' }).pipe(
      map(response => {
        this.serverAvailable = true;
        return response.status >= 200 && response.status < 300;
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleConnectionError(error, () => of(true));
      })
    );
  }
}

