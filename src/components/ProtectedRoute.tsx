import { Navigate } from "react-router-dom";
import { useAuth, getRoleRedirect } from "@/hooks/useAuth";

type AppRole = "campus_manager" | "property_manager" | "supervisor" | "cleaning_staff";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles required and user doesn't match, redirect to their correct view
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleRedirect(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
