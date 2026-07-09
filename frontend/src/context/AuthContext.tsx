import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  impersonateUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore auth state from localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem('supremogen_token');
    const savedUser = localStorage.getItem('supremogen_user');
    const savedRoles = localStorage.getItem('supremogen_roles');
    const savedPermissions = localStorage.getItem('supremogen_permissions');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setRoles(JSON.parse(savedRoles || '[]'));
      setPermissions(JSON.parse(savedPermissions || '[]'));
      
      // Set default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  // Set up Axios interceptor for 401 Unauthorized responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token is invalid/expired. Clear local state immediately to prevent infinite loops.
          setToken(null);
          setUser(null);
          setRoles([]);
          setPermissions([]);
          
          localStorage.removeItem('supremogen_token');
          localStorage.removeItem('supremogen_user');
          localStorage.removeItem('supremogen_roles');
          localStorage.removeItem('supremogen_permissions');
          
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      
      if (response.data.success) {
        const { access_token, user: userData, roles: userRoles, permissions: userPermissions } = response.data.data;
        
        // Update states
        setToken(access_token);
        setUser(userData);
        setRoles(userRoles);
        setPermissions(userPermissions);
        
        // Save to localStorage
        localStorage.setItem('supremogen_token', access_token);
        localStorage.setItem('supremogen_user', JSON.stringify(userData));
        localStorage.setItem('supremogen_roles', JSON.stringify(userRoles));
        localStorage.setItem('supremogen_permissions', JSON.stringify(userPermissions));
        
        // Configure Axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        return response.data.data;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Call logout endpoint (optional, will fail if token is already expired, so we wrap it)
      await axios.post('/api/v1/auth/logout').catch(() => {});
    } finally {
      // Clear state
      setToken(null);
      setUser(null);
      setRoles([]);
      setPermissions([]);
      
      // Clear storage
      localStorage.removeItem('supremogen_token');
      localStorage.removeItem('supremogen_user');
      localStorage.removeItem('supremogen_roles');
      localStorage.removeItem('supremogen_permissions');
      
      // Clear Axios header
      delete axios.defaults.headers.common['Authorization'];
      
      setLoading(false);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('supremogen_user', JSON.stringify(userData));
  };

  const impersonateUser = (data: any) => {
    const { access_token, user: userData, roles: userRoles, permissions: userPermissions } = data;
    setToken(access_token);
    setUser(userData);
    setRoles(userRoles);
    setPermissions(userPermissions);
    localStorage.setItem('supremogen_token', access_token);
    localStorage.setItem('supremogen_user', JSON.stringify(userData));
    localStorage.setItem('supremogen_roles', JSON.stringify(userRoles));
    localStorage.setItem('supremogen_permissions', JSON.stringify(userPermissions));
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        roles,
        permissions,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        updateUser,
        impersonateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
