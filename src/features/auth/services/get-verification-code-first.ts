import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.VerificationCodeWhereInput;
  orderBy?: Prisma.VerificationCodeOrderByWithRelationInput;
};

// ---- Service ----

/** Find the most recent unused verification code matching criteria — used to validate OTPs for MFA and sign-in flows. */
export async function getVerificationCodeFirst(props: Props) {
  return await prisma.verificationCode.findFirst(props);
}
