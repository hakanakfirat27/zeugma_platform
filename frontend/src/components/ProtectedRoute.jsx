import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (requiredRole && !rolesArray.includes(user?.role)) {
    if (user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user?.role === 'CLIENT') {
      return <Navigate to="/dashboard/client" replace />;
    }
    if (user?.role === 'GUEST') {
      return <Navigate to="/dashboard/guest" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;