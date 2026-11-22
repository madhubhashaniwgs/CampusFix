
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to authenticated requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campusfix_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid sessions consistently.
// Auth endpoints are excluded so failed login/register attempts
// (which legitimately return 401/400) do not trigger a redirect.
let isRedirectingToLogin = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

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
