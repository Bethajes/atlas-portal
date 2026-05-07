import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

function getPreferredTokenStorage() {
  const sessionToken = sessionStorage.getItem('accessToken');
  if (sessionToken) return sessionStorage;
  return localStorage;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);

  // On mount: check if we have a valid token and fetch user
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getPreferredTokenStorage().getItem('accessToken');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email, password, options = {}) => {
    const rememberMe = options.rememberMe !== false;
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    try {
      setError(null);
      const response = await api.post('/auth/login', {
        email,
        institutionalEmail: email,
        password,
      });
      const { user: loggedInUser, accessToken, refreshToken } = response.data;
      otherStorage.removeItem('accessToken');
      otherStorage.removeItem('refreshToken');
      storage.setItem('accessToken', accessToken);
      storage.setItem('refreshToken', refreshToken);

      // Immediately hydrate full profile so dashboard can show department/program/profile image.
      let hydratedUser = loggedInUser;
      try {
        const meResponse = await api.get('/auth/me');
        hydratedUser = meResponse.data?.user || loggedInUser;
      } catch (profileError) {
        console.warn('Unable to hydrate profile from /auth/me after login:', profileError);
      }

      setUser(hydratedUser);
      return { success: true, user: hydratedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (registerData) => {
    try {
      setError(null);
      
      // Since registration now involves a file upload, we use FormData
      // However, to keep this generic, we check if the input is already FormData
      let response;
      if (registerData instanceof FormData) {
        response = await api.post('/auth/register', registerData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/auth/register', registerData);
      }

      const { user: registeredUser, accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(registeredUser);
      return { success: true, user: registeredUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    authLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isInstructor: user?.role === 'INSTRUCTOR',
    isStudent: user?.role === 'STUDENT',
    isRegistrar: user?.role === 'REGISTRAR',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
