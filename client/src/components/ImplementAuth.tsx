import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";

const ImplementAuth = () => {
  const isAuthenticated = useAppSelector((s) => s.role.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
};

export default ImplementAuth;
