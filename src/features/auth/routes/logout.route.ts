import { updateRefreshTokens } from '@feature/auth/services/update-refresh-tokens';
import { SignOutSchema } from '@feature/auth/validators';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

/**
 * POST /api/auth/logout — Revoke the current refresh token and clear auth cookies
 * Auth: consumer should apply auth middleware
 *
 * Revokes the refresh token in the database and clears the access_token
 * and refresh_token cookies from the client's browser.
 */
export const postLogout: RequestHandler[] = [
  validate({ body: SignOutSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const bodyToken = req.body?.token || req.cookies?.refresh_token;

    if (bodyToken) {
      const hashedToken = hash(bodyToken);
      await updateRefreshTokens({
        where: { token: hashedToken },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return success(res, { message: 'Logged out successfully', data: null });
  }),
];
