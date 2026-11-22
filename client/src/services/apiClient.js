
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send the httpOnly auth cookie and CSRF cookie with every request.
  withCredentials: true,
});

let csrfToken = null;
let csrfFetchPromise = null;
let isRedirectingToLogin = false;

// Fetches a CSRF token from the backend. The token is stored only
// in memory (never localStorage) and echoed back via header.
export const refreshCsrfToken = async () => {
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = apiClient
    .get('/auth/csrf')
    .then((response) => {
      csrfToken = response.data?.data?.csrfToken || null;
      return csrfToken;
    })
    .finally(() => {
      csrfFetchPromise = null;
    });

  return csrfFetchPromise;
};

export const getCsrfToken = () => csrfToken;

apiClient.interceptors.request.use(
  async (config) => {
    if (!csrfToken) {
      await refreshCsrfToken();
    }

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid sessions consistently.
// Auth endpoints are excluded so failed login/register attempts
// (which legitimately return 401/400) do not trigger a redirect.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    // Retry once with a fresh CSRF token on CSRF failures.
    if (
      status === 403 &&
      !error.config.__csrfRetried &&
      (error.response?.data?.message || '').includes('CSRF')
    ) {
      error.config.__csrfRetried = true;
      csrfToken = null;
      await refreshCsrfToken();
      return apiClient(error.config);
    }

    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('campusfix_token');

      const path = window.location.pathname;
      const onAuthPage =
        path.startsWith('/login') || path.startsWith('/register');

      // Guard prevents repeated navigations when several requests
      // fail with 401 at the same time.
      if (!onAuthPage && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
