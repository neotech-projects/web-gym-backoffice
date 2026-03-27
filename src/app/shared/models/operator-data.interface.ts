export interface Operator {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthdate: string;
  birthdateDisplay?: string;
  gender: string;
  role: string;
  status: string;
  password?: string;
  registrationDate?: string;
  societaId?: number;
  societaNome?: string;
  matricola?: string;
}

/** Risposta GET …/api/utenti?staff=true (o …/api/utenti/operatori) — List<Utente> staff */
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
  societaNome?: string;
  matricola?: string;
  creato?: string;
  aggiornato?: string;
  password?: string;
}

export interface OperatorsResponse {
  success: boolean;
  data: Operator[];
  message?: string;
}

export interface OperatorResponse {
  success: boolean;
  data: Operator;
  message?: string;
}

