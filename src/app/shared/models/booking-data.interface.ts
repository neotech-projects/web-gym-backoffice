export interface BookingMachine {
  value: string;
  label: string;
}

export interface BookingExtendedProps {
  machines?: BookingMachine[];
  machinesFull?: string;
  user?: string;
  bookings?: Booking[];
  count?: number;
  allDay?: boolean;
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

