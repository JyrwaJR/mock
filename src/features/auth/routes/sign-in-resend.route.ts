import { BadRequestError, NotFoundError, TooManyRequestsError } from '@/src/shared/errors/http-errors';
import { createVerificationCode } from '@feature/auth/services/create-verification-code';
import { getVerificationCodeFirst } from '@feature/auth/services/get-verification-code-first';
import { ResendSignInCodeSchema } from '@feature/auth/validators';
import { verifyMfaTempToken } from '@/src/shared/utils/jwt-utils';
import { hash } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { generateOTP } from '../lib/otp';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import { success } from '@/src/shared/utils/response/express-response';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';

const OTP_RESEND_COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN) || 60;

/**
 * POST /api/auth/sign-in/resend — Resend the MFA code during sign-in
 * Auth: none (relies on mfa_temp_token cookie/body)
 *
 * Validates the MFA temp token, enforces a cooldown between resends to
 * prevent abuse, then generates and sends a new OTP verification code.
 */
export const postSignInResend: RequestHandler[] = [
  validate({ body: ResendSignInCodeSchema }),

  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const mfaCookie = req.cookies?.mfa_temp_token || req.body?.mfa_temp_token;
    if (!mfaCookie) throw new BadRequestError('Session expired. Please signin again');

    // ---- Verify the MFA temp token ----
    let payload;
    try {
      payload = await verifyMfaTempToken(mfaCookie);
    } catch {
      throw new BadRequestError('Session expired. Please signin again');
    }

    // ---- Look up the user from the token payload ----
    const user = await findUserAuthFirst({ where: { id: payload?.sub } });
    if (!user) throw new NotFoundError('User not found');

    // ---- Enforce resend cooldown ----
    const lastCode = await getVerificationCodeFirst({
      where: {
        userId: payload.sub,
        type: 'LOGIN_MFA',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastCode) {
      const timeSinceLastCode = Date.now() - lastCode.createdAt.getTime();
      const cooldownMs = OTP_RESEND_COOLDOWN * 1000;
      if (timeSinceLastCode < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastCode) / 1000);
        throw new TooManyRequestsError(
          `Please wait ${remainingSeconds} seconds before requesting a new code`,
        );
      }
    }

    // ---- Generate and persist a new OTP ----
    const otpLength = Number(process.env.OTP_LENGTH) || 6;
    const otp = generateOTP(otpLength);
    const hashedOTP = hash(otp);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

    await createVerificationCode({
      data: {
        user: { connect: { id: user.id } },
        code: hashedOTP,
        type: 'LOGIN_MFA',
        expiresAt: otpExpiry,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Verification code:', otp);
    }

    return success(res, {
      message: 'Verification code sent to your email',
      data: { codeSent: true },
    });
  }),
];
