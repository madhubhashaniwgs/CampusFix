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
  const [loading, setLoading] = useState(true);

  // Restore the logged-in user after a page refresh. The auth
  // token lives in an httpOnly cookie, so we simply ask the
  // backend who the current user is.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await getCurrentUser();
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const register = async (userData) => {
    const response = await registerUser(userData);

    setUser(response.data.user);

    return response;
  };

  const login = async (credentials) => {
    const response = await loginUser(credentials);

    setUser(response.data.user);

    return response;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
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
