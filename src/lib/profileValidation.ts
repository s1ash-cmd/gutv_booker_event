import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Укажите ФИО представителя").max(200),
  organization: z.string().trim().min(2, "Укажите организацию").max(300),
  representativeContacts: z
    .string()
    .trim()
    .min(2, "Укажите контакты представителя")
    .max(1000),
});
export const registrationSchema = profileSchema.extend({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(100)
    .regex(
      /^[\p{L}\p{N}_.-]+$/u,
      "Логин: буквы, цифры, точка, дефис и подчёркивание",
    ),
  password: z.string().min(8).max(256),
});
export const loginSchema = z.object({
  login: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});
export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});
