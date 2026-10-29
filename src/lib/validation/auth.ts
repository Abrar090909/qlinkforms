import { z } from "zod";

// Trim before validating so a pasted " name@example.com " is accepted.
export const emailSchema = z
  .string("Enter a valid email address.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Use at most 128 characters."),
});

// Email link types handled by /auth/confirm.
export const emailOtpTypeSchema = z.enum(["email", "signup"]);
