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

