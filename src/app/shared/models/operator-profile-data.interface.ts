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

/** Body PUT /api/operatori/profilo */
export interface ModificaProfiloRequest {
  email?: string;
  telefono?: string;
}

/** Body POST /api/operatori/profilo/cambio-password */
export interface CambioPasswordRequest {
  vecchiaPassword: string;
  nuovaPassword: string;
}

export interface OperatorProfileResponse {
  success: boolean;
  data: OperatorProfile;
  message?: string;
}

