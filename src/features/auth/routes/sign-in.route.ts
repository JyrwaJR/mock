import { ForbiddenError, UnauthorizedError } from '@/src/shared/errors/http-errors';
import { createRefreshToken } from '@feature/auth/services/create-refresh-token';
import { createVerificationCode } from '@feature/auth/services/create-verification-code';
import { SignInSchema } from '@feature/auth/validators';
import { signAccessToken, signMfaTempToken, signRefreshToken } from '@/src/shared/utils/jwt-utils';
import { hash as hashToken } from '@/src/shared/lib/hash';
import { validate } from '@/src/shared/middleware/express-validate';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import type { RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { generateOTP } from '../lib/otp';
import { verifyPassword } from '../lib/password';
import {
  setAccessTokenCookie,
  setMFATempTokenCookie,
  setRefreshTokenCookie,
} from '../utils/helpers';

import { success } from '@/src/shared/utils/response/express-response';
import { mockAsyncVerification } from '../utils/mock-async-verification';

import { findUserAuthFirst } from '@feature/auth/services/find-user-auth-first';
import { updateUserAuth } from '@feature/auth/services/update-user-auth';

/**
 * POST /api/auth/sign-in — Authenticate user with email and password
 * Auth: none (public)
 *
 * Validates credentials, checks for account lockout, handles failed
 * attempt tracking, and either issues tokens (no MFA) or sends an
 * MFA verification code and returns a temp token.
 */

export const postSignIn: RequestHandler[] = [
  validate({ body: SignInSchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const traceId = (req.traceId as string) || '';

    const user = await findUserAuthFirst({ where: { email: req.body?.email } });
    // check origin

    const isMobile = req.device.deviceType === 'mobile';

    // ---- Handle invalid credentials & ----
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // ---- Check account lockout ----
    // If the user has been locked due to too many failed attempts, reject early
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new ForbiddenError(`Account is locked. Try again in ${remainingMinutes} minutes`);
    }
    // ---- Verify password ----
    const isPasswordValid = user?.password
      ? await verifyPassword(req.body?.password || '', user.password)
      : await mockAsyncVerification();

    // Handle invalid credentials: increment failed attempts, lock if threshold reached
    if (!isPasswordValid) {
      if (user) {
        const failedAttempts = user.failedLoginAttempts + 1;
        const shouldLock = failedAttempts >= 5;
        await updateUserAuth({
          where: { id: user.id },
          data: {
            failedLoginAttempts: shouldLock ? 0 : failedAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
          },
        });
        if (shouldLock) {
          throw new ForbiddenError('Too many failed attempts. Account locked');
        }
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    // Defensive: should not happen after password check above, but ensures type safety
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // ---- Reset failed attempt counter on successful login ----
    await updateUserAuth({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // ---- MFA branch — send verification code and return temp token ----
    if (user.mfaEnabled) {
      const otp = generateOTP();
      const hashedOTP = hashToken(otp);
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

      // Log OTP in development for debugging; always email in production
      if (process.env.NODE_ENV === 'development') {
        // TODO: move to logger
        console.log(`OTP: ${otp}`);
      }

      if (process.env.NODE_ENV === 'production') {
        try {
          // TODO: sent via email service
          // await sendVerificationEmail(user.email, otp, 'LOGIN_MFA');
        } catch (error) {
          console.error(
            { traceId, error, userId: user.id },
            'Failed to send MFA verification email',
          );
        }
      }

      const mfaTempToken = await signMfaTempToken(user.id);

      setMFATempTokenCookie(res, mfaTempToken);

      console.info(
        { traceId, userId: user.id },
        'POST /api/auth/sign-in - MFA verification required',
      );
      return success(res, {
        message: 'MFA verification required',
        data: !isMobile ? null : { tempToken: mfaTempToken, mfaRequired: true },
      });
    }

    // ---- Non-MFA branch — issue access and refresh tokens directly ----
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id),
      signRefreshToken(user.id),
    ]);

    const hashedRefreshToken = hashToken(refreshToken);

    const refreshTokenExpiry = new Date();

    refreshTokenExpiry.setDate(refreshTokenExpiry.getMinutes() + 60);

    await createRefreshToken({
      data: {
        user: { connect: { id: user.id } },
        token: hashedRefreshToken,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Set secure httpOnly cookies for both tokens
    setAccessTokenCookie(res, accessToken);

    setRefreshTokenCookie(res, refreshToken);

    return success(res, {
      message: 'Signed in successfully',
      data: !isMobile ? null : { access_token: accessToken, refresh_token: refreshToken },
    });
  }),
];
