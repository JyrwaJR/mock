import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '@/src/shared/errors/http-errors';
import { createVerificationCode } from '@feature/auth/services/create-verification-code';
import { SetupMfaSchema } from '@feature/auth/validators';
import { verifyPassword } from '../../lib/password';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { generateOTP } from '../../lib/otp';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;

/**
 * POST /api/auth/mfa/setup — Initiate MFA setup by sending a verification code
 * Auth: consumer should apply auth middleware
 *
 * Verifies the user's current password, ensures MFA is not already enabled,
 * then generates an OTP and persists it as a verification code for SETUP_MFA.
 */
export const postMfaSetup: RequestHandler[] = [
  validate({ body: SetupMfaSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user?.id as string;
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { password } = req.body;

    // ---- Fetch user and verify password ----
    const user = await findUserAuthFirst({
      where: { id: userId },
    });

    if (!user || !user.password) throw new BadRequestError('Please set a password first');
    if (user.mfaEnabled) throw new ConflictError('MFA is already enabled');

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) throw new ValidationError('Invalid password');

    // ---- Generate and persist OTP ----
    const otp = generateOTP(OTP_LENGTH);
    const hashedOTP = hash(otp);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

    await createVerificationCode({
      data: {
        user: { connect: { id: userId } },
        code: hashedOTP,
        type: 'SETUP_MFA',
        expiresAt: otpExpiry,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('MFA Setup OTP:', otp);
    }

    return success(res, {
      message: 'Verification code sent to your email',
      data: { pending: true, codeSent: true },
    });
  }),
];
