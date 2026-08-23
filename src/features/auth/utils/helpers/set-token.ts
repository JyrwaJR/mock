import type { Response } from 'express';

export function setAccessTokenCookie(res: Response, accessToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 5 * 60 * 1000, // 5 minutes
    path: '/',
  });
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });
}

export function setMFATempTokenCookie(res: Response, mfaTempToken: string) {
  res.cookie('mfa_temp_token', mfaTempToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
}

export function setCSRFTokenCookie(res: Response, csrfToken: string) {
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}
