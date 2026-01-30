export interface OperatorProfile {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthdate: string;
  birthdateDisplay?: string;
  gender: string;
  role: string;
  avatar?: string;
}

export interface OperatorProfileResponse {
  success: boolean;
  data: OperatorProfile;
  message?: string;
}

