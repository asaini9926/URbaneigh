import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

// This component wraps protected routes
const RequireAuth = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // 1. Not Logged In? -> Go to Login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged In but wrong Role? (Optional: Redirect to Home)
  // For now, we assume if you are logged in, you can access, 
  // but the API will block data if you don't have permission.
  // Ideally, you'd check: if (allowedRoles && !user.roles.some(r => allowedRoles.includes(r))) ...

  return <Outlet />;
};

export default RequireAuth;