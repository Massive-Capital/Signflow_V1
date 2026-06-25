export type UserRole = 'owner' | 'admin' | 'member';
export type TokenType = 'access' | 'refresh';

export interface OrganizationRow {
  id: string;
  name: string;
  plan: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  organization_id: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  token_type: TokenType;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}
