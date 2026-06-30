import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  forbiddenRoles?: string[];
}

/**
 * Route guard that ensures the user is authenticated.
 * Optionally checks for a specific permission or forbidden roles.
 * Redirects to /agentportal (login) if unauthenticated.
 */
export default function ProtectedRoute({ children, requiredPermission, forbiddenRoles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, permissions, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/agentportal" state={{ from: location }} replace />;
  }

  if (forbiddenRoles && roles.some((r) => forbiddenRoles.includes(r))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="text-6xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="text-6xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
