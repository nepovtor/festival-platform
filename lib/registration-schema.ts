import { z } from "zod";

export const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Укажите email")
    .email("Введите корректный email"),
  guestsCount: z
    .number({ error: "Укажите количество посетителей" })
    .int("Введите целое число")
    .min(1, "Минимальное количество — 1")
    .max(20, "Максимальное количество — 20"),
  consent: z
    .boolean()
    .refine(Boolean, "Необходимо согласие на обработку данных"),
  website: z.string().max(0),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
