import { ForbiddenError } from '@/src/shared/errors/http-errors/http-errors';
import { asyncHandler } from '@/src/shared/utils/async-handler';
import type { RequestHandler } from 'express';

// TODO: add correct role type
export function rbac(...roles: any[]): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const role = req?.user?.roles;
    if (!role || !roles.some((r) => role.includes(r))) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  });
}
