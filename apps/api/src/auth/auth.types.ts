export interface AuthRequestUser {
  id: string;
  email: string;
  createdAt: Date;
  sessionId: string;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthUserResponse {
  user: PublicAuthUser;
}
