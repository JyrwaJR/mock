import { Router } from 'express';

import { postChangePassword } from './change-password.route';
import { postForgotPassword } from './forgot-password.route';
import { postLogout } from './logout.route';
import { getMe } from './me.route';
import { postMfaDisable } from './mfa/disable.route';
import { postMfaResend } from './mfa/resend.route';
import { postMfaSetup } from './mfa/setup.route';
import { postMfaVerify } from './mfa/verify.route';
import { postRefresh } from './refresh.route';
import { postResetPassword } from './reset-password.route';
import { postSignIn } from './sign-in.route';
import { postSignInResend } from './sign-in-resend.route';
import { postSignInVerify } from './sign-in-verify.route';
import { postSignUp } from './sign-up.route';

/** Aggregates all authentication-related route handlers under a single router. */
const router: Router = Router();

// ---- Public auth routes ----
router.post('/sign-up', postSignUp);
router.post('/sign-in', postSignIn);
router.post('/sign-in/verify', postSignInVerify);
router.post('/sign-in/resend', postSignInResend);
router.post('/refresh', postRefresh);
router.post('/forgot-password', postForgotPassword);
router.post('/reset-password', postResetPassword);

// ---- Protected auth routes (consumer should apply auth middleware) ----
router.get('/me', getMe);
router.post('/logout', postLogout);
router.post('/change-password', postChangePassword);

// ---- MFA routes ----
router.post('/mfa/setup', postMfaSetup);
router.post('/mfa/verify', postMfaVerify);
router.post('/mfa/resend', postMfaResend);
router.post('/mfa/disable', postMfaDisable);

export default router;
