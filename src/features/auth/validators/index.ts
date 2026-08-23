import { ALLOW_REGEX } from '@/src/shared/utils/regex-patterns';
import { passwordValidation } from '@/src/shared/validation/common';
import z from 'zod';

// ---- Sign Up ----

export const SignUpSchema = z
  .object({
    email: z.email('Invalid email address'),
    firstName: z.string().min(3, 'First name must be at least 3 characters'),
    lastName: z.string().min(3, 'Last name must be at least 3 characters'),
  })
  .refine((val) => val.lastName === val.firstName, {
    message: 'First name and last name cannot be the same',
  })
  .strict();

export type SignUpInput = z.infer<typeof SignUpSchema>;

// ---- Sign In ----

export const SignInSchema = z
  .object({
    email: z.email('Invalid email address'),
    password: passwordValidation,
  })
  .strict();

export type SignInInput = z.infer<typeof SignInSchema>;

// ---- Sign In Verify (MFA) ----

export const VerifySignInSchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/, 'Code must be 6 digits')
      .regex(ALLOW_REGEX.NUMERIC_ONLY, 'Code must be 6 digits')
      .length(6, 'Code must be 6 digits'),
    mfa_temp_token: z.string().optional(),
  })
  .strict();

export type VerifySignInInput = z.infer<typeof VerifySignInSchema>;

// ---- Refresh Token ----

export const RefreshTokenSchema = z
  .object({
    token: z.string().optional(),
  })
  .strict();

// ---- Sign Out ----

export const SignOutSchema = z
  .object({
    token: z.string().optional(),
  })
  .strict();

// ---- Forgot Password ----

export const ForgotPasswordSchema = z
  .object({
    email: z.email('Invalid email address'),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// ---- Reset Password ----

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: passwordValidation,
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ---- Change Password ----

export const ChangePasswordSchema = z
  .object({
    currentPassword: passwordValidation,
    newPassword: passwordValidation,
    confirmPassword: passwordValidation,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ---- MFA Verify ----

export const VerifyMfaSchema = z.object({ code: z.string().length(6, 'Code must be 6 digits') });

// ---- MFA Setup ----

export const SetupMfaSchema = z.object({ password: z.string().min(1, 'Password is required') });

// ---- MFA Disable ----

export const DisableMfaSchema = z.object({ password: z.string().min(1, 'Password is required') });

// ---- Sign In Resend ----

export const ResendSignInCodeSchema = z.object({ mfa_temp_token: z.string() });
