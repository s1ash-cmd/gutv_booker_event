export enum UserRole {
  Admin = 3,
  Organization = 4,
}

export interface CreateUserRequestDto {
  login: string;
  password: string;
  name: string;
  organization: string;
  representativeContacts: string;
}

export interface UserResponseDto {
  id: number;
  name: string;
  organization: string;
  representativeContacts: string;
  login: string;
  role: string;
  banned: boolean;
  avatarSeed?: string | null;
  avatarUrl?: string | null;
}
