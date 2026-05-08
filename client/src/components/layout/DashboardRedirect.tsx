import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { ROLE_HOME } from "./navConfig";

export const DashboardRedirect = () => {
  const role = useAppSelector((s) => s.role.activeRole);
  return <Navigate to={ROLE_HOME[role]} replace />;
};
