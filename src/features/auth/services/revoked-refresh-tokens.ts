import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.RefreshTokenWhereInput;
};

// ---- Service ----

/** Mark all refresh tokens matching the filter as revoked — security measure when token reuse is detected to invalidate the entire token family. */
export async function revokedRefreshTokens({ where }: Props) {
  return await prisma.refreshToken.updateMany({
    where,
    data: { revokedAt: new Date() },
  });
}
