export interface BookingMachine {
  value: string;
  label: string;
}

export interface BookingExtendedProps {
  machines?: BookingMachine[];
  machinesFull?: string;
  user?: string;
  /** Id utente (backend); usato in creazione e per risolvere il nome */
  utenteId?: number;
  bookings?: Booking[];
  count?: number;
  allDay?: boolean;
}

/** Risposta backend: List<Prenotazione> (GET /api/prenotazioni o /data/{date}) */
export interface PrenotazioneBackend {
  id?: number;
  utenteId: number;
  /** Data prenotazione */
  data?: string | number;
  /** Ora inizio */
  oraInizio?: string | number;
  /** Durata in minuti */
  durataMinuti?: number;
  stato?: string;
  usata?: boolean;
  creata?: string;
  annullata?: string;
}

export interface Booking {
  id: string;
  user?: string;
  start: string;
  end: string;
  title?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: BookingExtendedProps;
}

export interface BookingsResponse {
  success: boolean;
  data: {
    bookings: Booking[];
    allBookings?: Booking[]; // Opzionale: non restituito dal server, calcolato localmente se necessario
  };
  message?: string;
}

