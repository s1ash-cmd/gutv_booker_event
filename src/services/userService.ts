import crypto from "node:crypto";
import {
  type CreateUserRequestDto,
  type UserResponseDto,
  UserRole,
} from "@/app/models/user/user";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export class UserService {
  private async createDtoToUser(request: CreateUserRequestDto) {
    const salt = crypto.randomBytes(16).toString("base64");
    const passwordHash = crypto
      .createHash("sha256")
      .update(request.password + salt)
      .digest("base64");
    const normalizedLogin = request.login.trim().toLowerCase();

    return {
      login: normalizedLogin,
      passwordHash,
      salt,
      name: request.name,
      role: UserRole.Organization,
      banned: false,
    };
  }

  static userToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      login: user.login,
      role: UserRole[user.role],
      banned: user.banned,
    };
  }

  async saveRefreshToken(userId: number, refreshToken: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async getByRefreshToken(refreshToken: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExpiryTime: {
          gt: new Date(),
        },
      },
    });
  }

  async getByLogin(login: string): Promise<User | null> {
    const normalizedLogin = login.trim().toLowerCase();

    return await prisma.user.findFirst({
      where: {
        login: {
          equals: normalizedLogin,
        },
      },
    });
  }

  async updateUser(user: User) {
    await prisma.user.update({
      where: { id: user.id },
      data: user,
    });
  }

  async createUser(request: CreateUserRequestDto): Promise<UserResponseDto> {
    const normalizedLogin = request.login.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        login: {
          equals: normalizedLogin,
        },
      },
    });

    if (existingUser) {
      throw new Error("Пользователь с таким логином уже существует");
    }

    const userData = await this.createDtoToUser(request);

    const user = await prisma.user.create({ data: userData });

    return UserService.userToResponseDto(user);
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await prisma.user.findMany();
    return users.map(UserService.userToResponseDto);
  }

  async getUserById(id: number): Promise<UserResponseDto | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? UserService.userToResponseDto(user) : null;
  }

  async getUsersByName(namePart: string): Promise<UserResponseDto[] | null> {
    const normalizedNamePart = namePart.trim().toLowerCase();
    const users = await prisma.user.findMany();
    const matchedUsers = users.filter((user) =>
      user.name.toLowerCase().includes(normalizedNamePart),
    );
    return matchedUsers.length > 0
      ? matchedUsers.map(UserService.userToResponseDto)
      : null;
  }

  async banUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { banned: true },
    });
    return true;
  }

  async unbanUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { banned: false },
    });
    return true;
  }

  async makeAdmin(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.Admin },
    });
    return true;
  }

  async makeOrganization(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.Organization },
    });
    return true;
  }

  async deleteUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    await prisma.user.delete({
      where: { id: userId },
    });
    return true;
  }
}
