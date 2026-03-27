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

/** Body PUT …/api/utenti?staff=true&profilo=true&utenteId= */
export interface ModificaProfiloRequest {
  email?: string;
  telefono?: string;
}

/** Body POST …/api/utenti?staff=true&cambioPwd=true&utenteId= */
export interface CambioPasswordRequest {
  vecchiaPassword: string;
  nuovaPassword: string;
}

export interface OperatorProfileResponse {
  success: boolean;
  data: OperatorProfile;
  message?: string;
}

