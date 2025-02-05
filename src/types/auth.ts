export interface LoginCredentials {
  username: string;
  password: string;
  company: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
  };
}

export interface ErrorResponse {
  error: string;
}
