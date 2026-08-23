import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.RefreshTokenWhereUniqueInput;
  data: Prisma.RefreshTokenUpdateInput;
};

// ---- Service ----

/** Bulk-update refresh tokens matching the given criteria — used during logout to revoke all matching tokens. */
export async function updateRefreshTokens(props: Props) {
  return await prisma.refreshToken.updateMany(props);
}
