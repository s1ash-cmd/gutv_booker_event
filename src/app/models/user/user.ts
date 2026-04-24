export enum UserRole {
  Admin = 3,
  Organization = 4,
}

export interface CreateUserRequestDto {
  login: string;
  password: string;
  name: string;
}

export interface UserResponseDto {
  id: number;
  name: string;
  login: string;
  role: string;
  banned: boolean;
}
