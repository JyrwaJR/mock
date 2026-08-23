import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.RefreshTokenWhereUniqueInput;
  data: Prisma.RefreshTokenUpdateInput;
};

// ---- Service ----

/** Update a single refresh token — primarily used to mark tokens as revoked during token rotation. */
export async function updateRefreshToken(props: Props) {
  return await prisma.refreshToken.update(props);
}
