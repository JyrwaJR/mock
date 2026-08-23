import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/src/shared/errors/http-errors';
import { createVerificationCode } from '@feature/auth/services/create-verification-code';
import { getVerificationCodeFirst } from '@feature/auth/services/get-verification-code-first';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { generateOTP } from '../../lib/otp';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

const OTP_RESEND_COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN) || 60;
const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;

/**
 * POST /api/auth/mfa/resend — Resend the MFA setup verification code
 * Auth: consumer should apply auth middleware
 *
 * Validates the user exists, enforces a cooldown period between resends
 * to prevent abuse, then generates a new OTP and persists it as a
 * SETUP_MFA verification code.
 */
export const postMfaResend: RequestHandler[] = [
  validate({}),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user?.id as string;
    if (!userId) throw new UnauthorizedError('Unauthorized');

    // ---- Look up user ----
    const user = await findUserAuthFirst({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    // ---- Enforce resend cooldown ----
    const lastCode = await getVerificationCodeFirst({
      where: { userId, type: 'SETUP_MFA', expiresAt: { gt: new Date() }, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (lastCode) {
      const timeSinceLastCode = Date.now() - lastCode.createdAt.getTime();
      const cooldownMs = OTP_RESEND_COOLDOWN * 1000;
      if (timeSinceLastCode < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastCode) / 1000);
        throw new ForbiddenError(
          `Please wait ${remainingSeconds} seconds before requesting a new code`,
        );
      }
    }

    // ---- Generate and persist a new OTP ----
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
      console.log('MFA Resend OTP:', otp);
    }

    return success(res, {
      message: 'Verification code sent to your email',
      data: { codeSent: true },
    });
  }),
];
