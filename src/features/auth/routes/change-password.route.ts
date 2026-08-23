import { BadRequestError, UnauthorizedError, ValidationError } from '@/src/shared/errors/http-errors';
import { deleteRefreshTokens } from '@feature/auth/services/delete-refresh-tokens';
import type { ChangePasswordInput } from '@feature/auth/validators';
import { ChangePasswordSchema } from '@feature/auth/validators';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../lib/password';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

/**
 * POST /api/auth/change-password — Change password for the authenticated user
 * Auth: consumer should apply auth middleware
 *
 * Validates the current password, ensures the new password meets strength
 * requirements, updates it, and revokes all existing refresh tokens to
 * force re-authentication on all devices.
 */
export const postChangePassword: RequestHandler[] = [
  validate({ body: ChangePasswordSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user?.id as string;
    if (!userId) throw new UnauthorizedError('User not found');

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    // ---- Validate new password strength ----
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('; '));
    }

    // ---- Fetch user and verify current password ----
    const user = await findUserAuthFirst({ where: { id: userId } });
    if (!user || !user.password)
      throw new BadRequestError('Please use password reset to set a new password');

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) throw new BadRequestError('Current password is incorrect');

    // ---- Update password and revoke all existing sessions ----
    const hashedPassword = await hashPassword(newPassword);
    await updateUserAuth({ where: { id: userId }, data: { password: hashedPassword } });
    await deleteRefreshTokens({ where: { userId } });

    return success(res, {
      data: null,
      message: 'Password changed successfully. Please sign in again on other devices.',
    });
  }),
];
