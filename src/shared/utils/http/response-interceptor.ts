/**
 * @file Axios response interceptor — handles 401 errors with token refresh.
 *
 * On a 401 response, the interceptor attempts to refresh the access token
 * transparently and retry the original request. Auth-path errors bypass the
 * refresh flow and return directly to the caller.
 */

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { isAuthPath } from './constants';
import {
  isRefreshing,
  failedQueue,
  setRefreshing,
  processQueue,
  refreshToken,
} from './token-refresher';
import { triggerSessionExpired } from './session-expired-handler';

/**
 * Creates the response interceptor that handles 401 errors by attempting
 * to refresh the access token and retrying the failed request.
 *
 * Auth-path errors are returned directly to the caller without triggering
 * the refresh flow.
 *
 * @param apiClient - The Axios instance used to retry failed requests.
 * @returns A pair of [onFulfilled, onRejected] handlers for `axios.interceptors.response.use()`.
 */
export const createResponseInterceptor = (apiClient: AxiosInstance) => {
  return [
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (!originalRequest) {
        return Promise.reject(error);
      }

      const requestPath = originalRequest.url ?? '';

      if (isAuthPath(requestPath)) {
        if (error.response) return Promise.resolve(error.response);
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(apiClient(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        setRefreshing(true);

        try {
          const newToken = await refreshToken();
          processQueue(null, newToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          // TODO: Clear stored tokens from secure storage.
          // Example:
          //   await secureStorage.deleteItem('access_token');
          //   await secureStorage.deleteItem('refresh_token');
          //   await secureStorage.deleteItem('mfa_temp_token');

          triggerSessionExpired();

          if (error.response) return Promise.resolve(error.response);
          return Promise.reject(error);
        } finally {
          setRefreshing(false);
        }
      }

      return Promise.reject(error);
    },
  ] as const;
};
