import type { UserRole } from '@prisma/client';
import type { DeviceInfo } from '@/src/shared/middleware';

interface AuthenticatedUser {
  id: string;
  roles: UserRole[];
  associationId: string;
  associationSlug: string;
  associationName: string;
  memberTypeId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      traceId?: string;

      user?: AuthenticatedUser;

      signal?: AbortSignal;
      device: DeviceInfo;
    }
  }
}

export {};
