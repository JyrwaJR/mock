import axios from 'axios';
import { API_BASE_URL } from './constants';
import { createRequestInterceptor } from './request-interceptor';
import { createResponseInterceptor } from './response-interceptor';

/**
 * Configured Axios instance for application-wide API requests.
 * Includes base URL, credentials support, default JSON headers,
 * and interceptors for auth token injection and automatic token refresh.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000, // 15 seconds
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(createRequestInterceptor());
apiClient.interceptors.response.use(...createResponseInterceptor(apiClient));

export default apiClient;
