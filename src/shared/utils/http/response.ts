/**
 * @file Axios response and error handlers.
 *
 * Contains the two helper functions used by the HTTP client to transform
 * raw Axios responses and errors into the standardised {@link ApiResponse} shape.
 */

import { AxiosError, AxiosResponse } from 'axios';
import { ApiResponse } from '@/src/shared/types/api';

/**
 * Transforms an unknown error into a standard error {@link ApiResponse}.
 *
 * Handles three error categories:
 * - **AxiosError with response** — extracts server-provided message and details.
 * - **AxiosError without response (network)** — provides a connection-failure message.
 * - **Generic Error** — uses the error's own message.
 *
 * @param error - The caught error (Axios or otherwise).
 * @returns A standardised error response with `success: false`.
 */
export const handleAxiosError = <T>(error: unknown): ApiResponse<T> => {
  let errorMessage = 'Something went wrong. Please try again.';
  let errorDetails: string | Record<string, unknown> = '';

  if (error instanceof AxiosError) {
    if (error.response) {
      errorMessage = (error.response.data as { message?: string })?.message || errorMessage;
      errorDetails =
        (error.response.data as { error?: string | Record<string, unknown> })?.error ||
        error.response.data ||
        '';
    } else if (error.request) {
      errorMessage = 'Please check your internet connection.';
    } else {
      errorMessage = error.message;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return {
    success: false,
    message: errorMessage,
    error: errorDetails,
    data: null,
  };
};

/**
 * Transforms a successful Axios response into a standard {@link ApiResponse}.
 *
 * Marks the response as successful when the HTTP status is `200` or `201`.
 *
 * @param response - The Axios response object.
 * @returns A standardised success response.
 */
export const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> => {
  const {
    status,
    data: { data, message, meta },
  } = response;
  return {
    success: status === 200 || status === 201,
    message,
    data,
    meta,
  };
};
