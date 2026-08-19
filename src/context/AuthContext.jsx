import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../services/api';
import AuthContext from './authContextInstance';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    getCurrentUser()
      .then((data) => active && setUser(data.user))
      .catch((error) => {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          setUser(null);
        }
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const register = async (credentials) => {
    const data = await registerRequest(credentials);
    setUser(data.user);
    return data.user;
  };

  const login = async (credentials) => {
    const data = await loginRequest(credentials);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    register,
    login,
    logout,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
