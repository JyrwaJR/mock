/**
 * @file Axios HTTP client wrapper with typed responses and request cancellation support.
 *
 * Provides a thin wrapper around `axios` with standardised error handling
 * and typed response shapes. Each method returns a consistent {@link ApiResponse} shape.
 */

import { AxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/src/shared/types/api';
import { handleResponse, handleAxiosError } from './response';
import apiClient from './client';

/**
 * Typed HTTP client with `get`, `post`, `put`, and `delete` methods.
 *
 * All methods return a standardised {@link ApiResponse} and handle errors
 * uniformly through {@link handleAxiosError}. Cancelled requests are logged
 * using the client logger.
 *
 * @example
 * ```ts
 * const res = await http.get<User[]>("/users");
 * if (res.success) {
 *   console.log(res.data);
 * }
 * ```
 */

export const http = {
  /**
   * Sends a GET request.
   *
   * @param url    - The request URL.
   * @param config - Optional Axios request config.
   * @returns A promise resolving to a typed {@link ApiResponse}.
   */
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.get(url, config);
      return handleResponse<T>(response);
    } catch (error) {
      return handleAxiosError<T>(error);
    }
  },

  /**
   * Sends a POST request.
   *
   * @param url    - The request URL.
   * @param data   - Optional payload object.
   * @param config - Optional Axios request config.
   * @returns A promise resolving to a typed {@link ApiResponse}.
   */
  post: async <T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post(url, data, config);
      return handleResponse<T>(response);
    } catch (error) {
      return handleAxiosError<T>(error);
    }
  },

  /**
   * Sends a PUT request.
   *
   * @param url    - The request URL.
   * @param data   - Optional payload object.
   * @param config - Optional Axios request config.
   * @returns A promise resolving to a typed {@link ApiResponse}.
   */
  put: async <T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.put(url, data, config);
      return handleResponse<T>(response);
    } catch (error) {
      return handleAxiosError<T>(error);
    }
  },

  /**
   * Sends a DELETE request.
   *
   * @param url    - The request URL.
   * @param config - Optional Axios request config.
   * @returns A promise resolving to a typed {@link ApiResponse}.
   */
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.delete(url, config);
      return handleResponse<T>(response);
    } catch (error) {
      return handleAxiosError<T>(error);
    }
  },
};
