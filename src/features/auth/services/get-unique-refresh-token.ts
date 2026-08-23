import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

type Props = {
  where: Prisma.RefreshTokenWhereUniqueInput;
  include: Prisma.RefreshTokenInclude;
};

// ---- Service ----

/** Retrieve a single refresh token by its unique identifier, including related user data for token rotation validation. */
export async function getUniqueRefreshToken(props: Props) {
  return await prisma.refreshToken.findUnique(props);
}
