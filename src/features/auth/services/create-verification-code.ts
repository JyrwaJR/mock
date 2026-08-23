import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

/** Props for creating a verification code. */
type Props = {
  /** The data to create the verification code with. */
  data: Prisma.VerificationCodeCreateInput;
};

// ---- Service ----

/** Persist a new verification code (e.g. OTP) for flows such as MFA setup, sign-in MFA, or password reset. */
export async function createVerificationCode(props: Props) {
  return await prisma.verificationCode.create(props);
}
