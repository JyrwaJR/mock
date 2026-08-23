import { Prisma } from '@prisma/client';
import { prisma } from '@/src/shared/lib/prisma';

type Props = Prisma.UserFindFirstArgs;

export async function findUserAuthFirst(props: Props) {
  return await prisma.user.findFirst(props);
}
