import { normalizeUnknownError } from '@/src/shared/errors/normalize-error/normalize-error';
import { NextRequest, NextResponse } from 'next/server';

type RouteHandler<T> = (request: NextRequest, context: T) => Promise<Response>;

export function handleErrors<T>(handler: RouteHandler<T>) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const normalizeError = normalizeUnknownError(error);
      return NextResponse.json(
        {
          error: normalizeError,
          message: normalizeError.message,
          success: false,
        },
        { status: normalizeError.statusCode },
      );
    }
  };
}
