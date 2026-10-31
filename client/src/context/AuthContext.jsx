import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem('campusfix_token')
  );
  const [loading, setLoading] = useState(true);

  // Restore the logged-in user after a page refresh.
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser(token);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('campusfix_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  const saveSession = (result) => {
    localStorage.setItem('campusfix_token', result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const register = async (userData) => {
    const response = await registerUser(userData);

    saveSession(response.data);

    return response;
  };

  const login = async (credentials) => {
    const response = await loginUser(credentials);

    saveSession(response.data);

    return response;
  };

 const logout = async () => {
  try {
    if (token) {
      await logoutUser(token);
    }
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    localStorage.removeItem('campusfix_token');
    setToken(null);
    setUser(null);
  }
};

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};