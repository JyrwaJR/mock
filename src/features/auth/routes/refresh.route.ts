import { UnauthorizedError } from '@/src/shared/errors/http-errors';
import { createRefreshToken } from '@feature/auth/services/create-refresh-token';
import { getUniqueRefreshToken } from '@feature/auth/services/get-unique-refresh-token';
import { revokedRefreshTokens } from '@feature/auth/services/revoked-refresh-tokens';
import { updateRefreshToken } from '@feature/auth/services/update-refresh-token';
import { RefreshTokenSchema } from '@feature/auth/validators';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/src/shared/utils/jwt-utils';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { setAccessTokenCookie, setRefreshTokenCookie } from '../utils/helpers';

/**
 * POST /api/auth/refresh — Rotate access and refresh tokens
 * Auth: none (relies on refresh_token cookie/body)
 *
 * Verifies the current refresh token, checks for reuse (revocation),
 * enforces a grace period for concurrent requests, then issues a new
 * token pair and revokes the old one.
 */
export const postRefresh: RequestHandler[] = [
  validate({ body: RefreshTokenSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const bodyToken = req.body?.token;
    const refreshCookie = req.cookies?.refresh_token || bodyToken;

    if (!refreshCookie) throw new UnauthorizedError('Refresh token not found');

    // ---- Verify the JWT signature ----
    try {
      await verifyRefreshToken(refreshCookie);
    } catch (error) {
      console.error(
        'Invalid refresh token:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new UnauthorizedError('Invalid refresh token');
    }

    // ---- Hash the token to look up in DB ----
    const hashedToken = hash(refreshCookie);

    // ---- Look up the stored refresh token in DB ----
    const storedToken = await getUniqueRefreshToken({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken || !storedToken.userId) throw new UnauthorizedError('Invalid refresh token');

    // ---- Detect token reuse (revoked token presented) ----
    if (storedToken.revokedAt) {
      const gracePeriodMs = 30 * 1000;
      if (Date.now() - storedToken.revokedAt.getTime() > gracePeriodMs) {
        console.warn('Revoking all family tokens for user:', storedToken.userId);
        await revokedRefreshTokens({ where: { userId: storedToken.userId } });
      }
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reject expired tokens
    if (storedToken.expiresAt < new Date())
      throw new UnauthorizedError('Refresh token has expired');

    // Inactive users should not receive new tokens
    const user = storedToken.user;
    if (user.status !== 'ACTIVE') throw new UnauthorizedError('User is not active');

    // ---- Issue new token pair and revoke the old one ----
    const newAccessToken = await signAccessToken(user.id);
    const newRefreshToken = await signRefreshToken(user.id);
    const hashedNewRefreshToken = hash(newRefreshToken);
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await updateRefreshToken({ where: { id: storedToken.id }, data: { revokedAt: new Date() } });

    await createRefreshToken({
      data: {
        user: { connect: { id: user.id } },
        token: hashedNewRefreshToken,
        expiresAt: refreshTokenExpiry,
      },
    });

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    return success(res, {
      message: 'Token refreshed successfully',
      data: { access_token: newAccessToken, refresh_token: newRefreshToken },
    });
  }),
];
