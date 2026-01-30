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

