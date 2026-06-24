/**
 * @file Token refresh logic and failed-request queue.
 *
 * Manages the state of in-flight token refresh attempts and queues
 * requests that arrive while a refresh is in progress so they can be
 * retried once the new token is available.
 */

import { API_BASE_URL } from './constants';
import type { QueueItem } from '@/src/shared/types/api';
import apiClient from './client';

/** Flag indicating if a token refresh request is currently in flight. */
export let isRefreshing = false;

/** List of requests waiting for the token refresh to complete. */
export const failedQueue: QueueItem[] = [];

/** @internal */
export const setRefreshing = (value: boolean) => {
  isRefreshing = value;
};

/**
 * Processes the failed request queue after a refresh attempt.
 *
 * @param error - If provided, all queued requests are rejected with this error.
 * @param token - If provided, all queued requests are resolved with this new token.
 */
export const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue.length = 0;
};

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
};

/**
 * Performs a token refresh request using the stored refresh token.
 *
 * TODO: Retrieve the refresh token from secure storage before making the
 *       request, and persist the new access/refresh tokens after a successful
 *       response.
 *
 * @throws If the refresh request fails.
 * @returns The new access token.
 */
export const refreshToken = async (): Promise<string> => {
  const refreshTokenValue = ''; // TODO: read from secure storage

  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<{ data?: RefreshResponse }>(
    `${API_BASE_URL}/auth/refresh`,
    { token: refreshTokenValue },
  );

  const newAccessToken = response.data.data?.access_token ?? '';

  if (newAccessToken) {
    // TODO: persist to secure storage
  }

  const newRefreshToken = response.data?.data?.refresh_token ?? '';
  if (newRefreshToken) {
    // TODO: persist to secure storage
  }

  return newAccessToken;
};
