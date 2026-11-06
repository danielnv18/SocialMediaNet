import { z } from "zod";

// Mirrors ASP.NET Core Identity's default PasswordOptions so the server rarely has to reject.
const newPassword = z
  .string()
  .min(6, "Use at least 6 characters.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol, such as ! or #.");

const required = (message: string) => z.string().trim().min(1, message);

const email = required("Enter your email.").email("Enter a valid email address.");

const passwordsMatch = <T extends { confirmPassword: string }>(
  schema: z.ZodType<T>,
  passwordKey: Exclude<keyof T, "confirmPassword">,
) =>
  schema.refine((values) => values[passwordKey] === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

export const loginSchema = z.object({
  login: required("Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = passwordsMatch(
  z.object({
    userName: required("Choose a username.").regex(
      /^[A-Za-z0-9\-._@+]+$/,
      "Use letters, numbers, and - . _ @ + only.",
    ),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  }),
  "password",
);

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = passwordsMatch(
  z.object({ newPassword, confirmPassword: z.string() }),
  "newPassword",
);
