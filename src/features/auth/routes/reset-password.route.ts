import { UnauthorizedError, ValidationError } from '@/src/shared/errors/http-errors';
import { deleteRefreshTokens } from '@feature/auth/services/delete-refresh-tokens';
import type { ResetPasswordInput } from '@feature/auth/validators';
import { ResetPasswordSchema } from '@feature/auth/validators';
import { hashPassword, validatePasswordStrength } from '../lib/password';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

/**
 * POST /api/auth/reset-password — Complete password reset with token
 * Auth: none (public, relies on reset token from email)
 *
 * Validates the new password strength, verifies the reset token,
 * updates the user's password, clears the reset fields, and revokes
 * all existing refresh tokens to force re-login on all devices.
 */
export const postResetPassword: RequestHandler[] = [
  validate({ body: ResetPasswordSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token, password } = req.body as ResetPasswordInput;

    // ---- Validate password strength ----
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }

    // ---- Verify reset token ----
    const hashedToken = hash(token);
    const user = await findUserAuthFirst({
      where: { passwordResetToken: hashedToken, passwordResetExpires: { gt: new Date() } },
    });

    if (!user) throw new UnauthorizedError('Invalid or expired reset token');

    // ---- Update password and clear reset fields ----
    const hashedPassword = await hashPassword(password);
    await updateUserAuth({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all refresh tokens so the user must sign in again on every device
    await deleteRefreshTokens({ where: { userId: user.id } });

    return success(res, {
      data: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  }),
];
