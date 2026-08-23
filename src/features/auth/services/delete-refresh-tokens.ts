import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.RefreshTokenWhereInput;
};

// ---- Service ----

/** Remove all refresh tokens matching the given criteria — used when a password change or reset invalidates all existing sessions. */
export async function deleteRefreshTokens(props: Props) {
  return await prisma.refreshToken.deleteMany(props);
}
