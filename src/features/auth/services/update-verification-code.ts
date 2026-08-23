import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.VerificationCodeWhereUniqueInput;
  data: Prisma.VerificationCodeUpdateInput;
};

// ---- Service ----

/** Update a verification code — used to increment attempt counters and mark codes as used after successful OTP validation. */
export async function updateVerificationCode(props: Props) {
  return await prisma.verificationCode.update(props);
}
