import { prisma } from '@/src/shared/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---- Types ----

/** Props for creating a refresh token. */
type Props = {
  /** The data to create the refresh token with. */
  data: Prisma.RefreshTokenCreateInput;
};

// ---- Service ----

/** Persist a new refresh token in the database for later verification during token rotation. */
export async function createRefreshToken(props: Props) {
  return await prisma.refreshToken.create(props);
}
