/**
 * @file Axios request interceptor — attaches access token and device headers.
 *
 * Adds a trace ID, device type, association slug, and Bearer token (if available)
 * to every outgoing request.
 */

import type { InternalAxiosRequestConfig } from 'axios';

/**
 * Creates the request interceptor that attaches the access token and device headers
 * to every outgoing request.
 *
 * @returns The request interceptor function.
 */
export const createRequestInterceptor = () => {
  return async (config: InternalAxiosRequestConfig) => {
    // TODO: Retrieve access token from secure storage and attach as Bearer token.
    return config;
  };
};
