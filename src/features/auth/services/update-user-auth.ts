import { prisma } from '@/src/shared/lib/prisma';
import { Prisma } from '@prisma/client';

// ---- Types ----

/** Props for updating a single user auth. */
export type Props = Prisma.UserUpdateArgs;

// ---- Functions ----
export async function updateUserAuth(props: Props) {
  return await prisma.user.update(props);
}
