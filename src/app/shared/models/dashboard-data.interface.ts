export interface DashboardStats {
  weeklyBookings: number;
  monthlyPresences: number;
  currentPresences: number;
  lastUpdate: string;
}

/** Risposta GET /api/dashboard/stats da ms-gym-backoffice */
export interface DashboardStatsBackendResponse {
  presenzeAttuali: number;
  listaPresenzaAttuali: AccessoBackend[];
}

/** DTO Accesso restituito da ms-gym-backoffice (lista presenze) */
export interface AccessoBackend {
  id: number;
  utenteId: number;
  prenotazioneId?: number;
  dataOraAccesso: string;
  esito: string;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardStats;
  message?: string;
}

export interface CurrentPresence {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  company?: string;
  bookingNote?: string;
  bookingStartTime?: string;
  bookingEndTime?: string;
  bookingDuration?: string;
}

export interface CurrentPresencesResponse {
  success: boolean;
  currentPresences: number;
  presences?: CurrentPresence[];
}

