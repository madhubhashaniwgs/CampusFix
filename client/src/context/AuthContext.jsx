import { createContext, useContext, useEffect, useState } from 'react';

import { registerUser, loginUser, getCurrentUser, logoutUser } from '../services/authService';
import { connectSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext(null);

// Non-sensitive hint that a session may exist. The actual JWT
// stays in an httpOnly cookie; this flag only prevents a pointless
// /auth/me call (and its expected 401) for logged-out visitors.
export const SESSION_HINT_KEY = 'campusfix_has_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the logged-in user after a page refresh. The auth
  // token lives in an httpOnly cookie, so we simply ask the
  // backend who the current user is.
  useEffect(() => {
    const restoreSession = async () => {
      if (!sessionStorage.getItem(SESSION_HINT_KEY)) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setUser(response.data);
      } catch (error) {
        sessionStorage.removeItem(SESSION_HINT_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const register = async (userData) => {
    const response = await registerUser(userData);

    sessionStorage.setItem(SESSION_HINT_KEY, '1');
    setUser(response.data.user);

    return response;
  };

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    connectSocket();

    sessionStorage.setItem(SESSION_HINT_KEY, '1');
    setUser(response.data.user);

    return response;
  };

  const logout = async () => {
    try {
      await logoutUser();
      disconnectSocket();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      sessionStorage.removeItem(SESSION_HINT_KEY);
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
