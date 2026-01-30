export interface DashboardStats {
  weeklyBookings: number;
  monthlyPresences: number;
  currentPresences: number;
  lastUpdate: string;
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

