import apiClient from './apiClient';

// All auth calls go through apiClient so they automatically
// include credentials (cookies) and the CSRF token header.
export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const changePassword = async (passwords) => {
  const response = await apiClient.post('/auth/change-password', passwords);
  return response.data;
};
