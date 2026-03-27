export interface User {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  birthdate: string;
  birthdateDisplay?: string;
  gender: string;
  matricola: string;
  /** Ruolo da tipo_utente (es. Iscritto, Operatore); preferito per filtri */
  tipoUtente?: string;
  userCode: string;
  status: string;
  accessHistory?: AccessHistoryEntry[];
  bookingHistory?: BookingHistoryEntry[];
  dichiarazioneManleva?: boolean;
  password?: string;
  registrationDate?: string;
  societaId?: number;
}

/** Risposta GET /api/utenti da  (List<Utente> = array) */
export interface UtenteBackend {
  id?: number;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  dataNascita?: string;
  sesso?: string;
  tipoUtente?: string;
  stato?: string;
  societaId?: number;
  /** Nome società: se inviato e societaId assente, il backend può risolvere o creare la società */
  societaNome?: string;
  matricola?: string;
  creato?: string;
  aggiornato?: string;
  password?: string;
}

export interface AccessHistoryEntry {
  date: string;
  time: string;
  device?: string;
  location?: string;
}

export interface BookingHistoryEntry {
  date: string;
  time: string;
  hasAccess: boolean; // true se ha effettuato l'accesso, false se nonostante la prenotazione non è andato
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  message?: string;
}

export interface UserResponse {
  success: boolean;
  data: User;
  message?: string;
}

