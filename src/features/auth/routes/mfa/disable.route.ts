import { BadRequestError, UnauthorizedError } from '@/src/shared/errors/http-errors';
import { DisableMfaSchema } from '@feature/auth/validators';
import { verifyPassword } from '../../lib/password';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

/**
 * POST /api/auth/mfa/disable — Disable MFA for the authenticated user
 * Auth: consumer should apply auth middleware
 *
 * Verifies the user's current password, confirms MFA is currently enabled,
 * then disables it. This is a sensitive operation that requires re-entry of
 * the password to prevent unauthorized disabling.
 */
export const postMfaDisable: RequestHandler[] = [
  validate({ body: DisableMfaSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user?.id as string;
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { password } = req.body;

    // ---- Fetch user and check MFA status ----
    const user = await findUserAuthFirst({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled) throw new BadRequestError('MFA is not enabled');
    if (!user.password) throw new BadRequestError('Please set a password first');

    // Verify the user's password before allowing MFA to be disabled
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) throw new UnauthorizedError('Invalid password');

    // ---- Disable MFA ----
    await updateUserAuth({ where: { id: userId }, data: { mfaEnabled: false } });

    return success(res, { message: 'MFA disabled successfully', data: { mfaEnabled: false } });
  }),
];
