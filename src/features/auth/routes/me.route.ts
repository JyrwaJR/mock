import { UnauthorizedError } from '@/src/shared/errors/http-errors';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { Request, RequestHandler, Response } from 'express';

/**
 * GET /api/auth/me — Fetch the current authenticated user's profile
 * Auth: consumer should apply auth middleware
 *
 * Returns the authenticated user's profile from the database.
 */
export const getMe: RequestHandler[] = [
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) throw new UnauthorizedError('Unauthorized');

    // ---- Fetch fresh user data from the database ----
    const user = await findUserAuthFirst({ where: { id: userId } });

    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedError('User not found or inactive');

    return success(res, { message: 'User fetched successfully', data: user });
  }),
];
