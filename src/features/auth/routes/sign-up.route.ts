import { BadRequestError, ConflictError } from '@/src/shared/errors/http-errors';
import type { SignUpInput } from '../validators';
import { SignUpSchema } from '../validators';
import { validate } from '@/src/shared/middleware/express-validate';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { createUser } from '../services/create-user';
import { findUserAuthFirst } from '../services/find-user-auth-first';

/**
 * POST /api/auth/sign-up — Submit a membership application for a new account
 * Auth: none (public)
 *
 * Validates the membership application form, ensures the target association
 * exists, verifies no active user already exists with this email, and creates
 * a pending membership application for admin review and approval.
 */
export const postSignUp: RequestHandler[] = [
  validate({ body: SignUpSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const traceId = (req.traceId as string) || '';
    console.info({ traceId, email: req.body?.email }, 'POST /api/auth/sign-up - Request started');

    // ---- Extract validated input ----
    const { email, firstName, lastName } = req.body as SignUpInput;

    const associationSlug = req.headers['x-association-slug'] as string | undefined;
    // ---- Validate association and check for existing user ----
    if (!associationSlug) throw new BadRequestError('Invalid association');
    // Run both lookups in parallel since they are independent of each other
    const user = await findUserAuthFirst({ where: { email } });

    if (user) {
      throw new ConflictError('User already exists');
    }

    // ---- Create membership application ----
    const application = await createUser({
      data: {
        email,
        firstName,
        name: `${firstName} ${lastName}`,
        lastName,
      },
    });

    console.info({ traceId, applicationId: application.id }, 'POST /api/auth/sign-up - Success');

    // ---- Respond with created application summary ----
    return success(
      res,
      {
        message: 'User created successfully',
        data: {
          id: application.id,
          email: application.email,
          status: application.status,
          createdAt: application.createdAt,
        },
      },
      201,
    );
  }),
];
