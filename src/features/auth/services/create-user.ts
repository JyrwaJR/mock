import { Prisma } from '@prisma/client';
import { prisma } from '@/src/shared/lib/prisma';

type Props = Prisma.UserCreateArgs;

export async function createUser(props: Props) {
  return await prisma.user.create(props);
}
