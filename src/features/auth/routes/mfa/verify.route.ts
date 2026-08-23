import { TooManyRequestsError, UnauthorizedError } from '@/src/shared/errors/http-errors';
import { getVerificationCodeFirst } from '@feature/auth/services/get-verification-code-first';
import { updateVerificationCode } from '@feature/auth/services/update-verification-code';
import { VerifyMfaSchema } from '@feature/auth/validators';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 3;

/**
 * POST /api/auth/mfa/verify — Confirm MFA setup by submitting the verification code
 * Auth: consumer should apply auth middleware
 *
 * Validates the OTP code submitted by the user, checks expiration and attempt
 * limits, then enables MFA on the user's account.
 */
export const postMfaVerify: RequestHandler[] = [
  validate({ body: VerifyMfaSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user?.id as string;
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { code } = req.body;
    const hashedCode = hash(code);

    // ---- Fetch the most recent unused SETUP_MFA code ----
    const verificationCode = await getVerificationCodeFirst({
      where: { userId, type: 'SETUP_MFA', expiresAt: { gt: new Date() }, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) throw new UnauthorizedError('Invalid or expired verification code');

    // Enforce max attempts to prevent brute-force guessing
    if (verificationCode.attempts >= OTP_MAX_ATTEMPTS) {
      throw new TooManyRequestsError('Too many attempts. Please request a new code');
    }

    // Increment attempt counter on mismatch
    if (verificationCode.code !== hashedCode) {
      await updateVerificationCode({
        where: { id: verificationCode.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedError('Invalid verification code');
    }

    // ---- Mark code as used and enable MFA ----
    await updateVerificationCode({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });
    await updateUserAuth({ where: { id: userId }, data: { mfaEnabled: true } });

    return success(res, { message: 'MFA enabled successfully', data: { mfaEnabled: true } });
  }),
];
