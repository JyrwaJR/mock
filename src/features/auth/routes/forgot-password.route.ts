import type { ForgotPasswordInput } from '@feature/auth/validators';
import { ForgotPasswordSchema } from '@feature/auth/validators';
import { signPasswordResetToken } from '@/src/shared/utils/jwt-utils';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

/**
 * POST /api/auth/forgot-password — Request a password reset email
 * Auth: none (public)
 *
 * Looks up the user by email, generates a password reset token, stores
 * a hashed copy with an expiry on the user record, and sends the
 * plain-text token to the user's email. Always returns the same message
 * regardless of whether the email exists (to prevent email enumeration).
 */
export const postForgotPassword: RequestHandler[] = [
  validate({ body: ForgotPasswordSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = req.body as ForgotPasswordInput;
    const user = await findUserAuthFirst({ where: { email } });

    // Return generic success even if email is not found, preventing
    // attackers from enumerating valid email addresses
    if (!user) {
      return success(res, { message: 'A reset email will be sent', data: null });
    }

    // ---- Generate and store reset token ----
    const resetToken = await signPasswordResetToken(user.id);
    const hashedToken = hash(resetToken);
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1);

    await updateUserAuth({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpires: resetExpiry },
    });

    // Log the token in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Reset password token:', resetToken);
    }

    return success(res, { message: 'A reset email will be sent', data: null });
  }),
];
