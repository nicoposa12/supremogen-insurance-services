import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  profile_photo_url?: string | null;
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

      // Asynchronously sync user roles and permissions from backend in case they changed
      axios.get('/api/v1/auth/profile')
        .then(response => {
          if (response.data.success) {
            const { user: userData, roles: userRoles, permissions: userPermissions } = response.data.data;
            setUser(userData);
            setRoles(userRoles);
            setPermissions(userPermissions);
            localStorage.setItem('supremogen_user', JSON.stringify(userData));
            localStorage.setItem('supremogen_roles', JSON.stringify(userRoles));
            localStorage.setItem('supremogen_permissions', JSON.stringify(userPermissions));
          }
        })
        .catch(err => {
          console.error('Failed to sync profile roles on startup:', err);
        });
    }
    setLoading(false);
  }, []);

  // Set up Axios interceptor for 401 Unauthorized and 429 Too Many Requests responses
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

        // Rate limit exceeded — dispatch a global toast event
        if (error.response && error.response.status === 429) {
          const message = error.response.data?.message || 'Too many requests. Please slow down.';
          window.dispatchEvent(new CustomEvent('global-toast', {
            detail: { message, variant: 'error' },
          }));
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

  // ─── Idle Auto-Logout (1 hour) ──────────────────────────────────────────────
  const IDLE_TIMEOUT = 60 * 60 * 1000;   // 1 hour in ms
  const WARNING_BEFORE = 5 * 60 * 1000;  // Show warning 5 minutes before logout
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarned = useRef(false);

  const resetIdleTimer = useCallback(() => {
    if (!token) return; // Only track when authenticated

    // Clear existing timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    hasWarned.current = false;

    // Set warning timer (fires 5 min before logout)
    warningTimer.current = setTimeout(() => {
      hasWarned.current = true;
      window.dispatchEvent(new CustomEvent('global-toast', {
        detail: {
          message: 'You will be logged out in 5 minutes due to inactivity.',
          variant: 'warning',
        },
      }));
    }, IDLE_TIMEOUT - WARNING_BEFORE);

    // Set logout timer
    idleTimer.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('global-toast', {
        detail: {
          message: 'You have been logged out due to inactivity.',
          variant: 'error',
        },
      }));
      logout();
    }, IDLE_TIMEOUT);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetIdleTimer();

    // Throttle to avoid excessive timer resets (max once per 30s)
    let lastReset = Date.now();
    const throttledHandler = () => {
      if (Date.now() - lastReset > 30_000) {
        lastReset = Date.now();
        handleActivity();
      }
    };

    events.forEach((event) => window.addEventListener(event, throttledHandler, { passive: true }));
    resetIdleTimer(); // Start the timer immediately

    return () => {
      events.forEach((event) => window.removeEventListener(event, throttledHandler));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [token, resetIdleTimer]);
  // ─── End Idle Auto-Logout ──────────────────────────────────────────────────

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
