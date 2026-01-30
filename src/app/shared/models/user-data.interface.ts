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
  userCode: string;
  status: string;
  accessHistory?: AccessHistoryEntry[];
  bookingHistory?: BookingHistoryEntry[];
  certificatoMedico?: boolean;
  password?: string;
  registrationDate?: string;
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

