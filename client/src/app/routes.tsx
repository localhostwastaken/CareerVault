import React, { Suspense } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import ImplementAuth from "@/components/ImplementAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardRedirect } from "@/components/layout/DashboardRedirect";

const Landing = React.lazy(() => import("@/pages/public/Landing"));
const Verify = React.lazy(() => import("@/pages/public/Verify"));
const Login = React.lazy(() => import("@/pages/Login/Login"));
const Register = React.lazy(() => import("@/pages/Register/Register"));
const Profile = React.lazy(() => import("@/pages/Profile/Profile"));
const HolderDashboard = React.lazy(() => import("@/pages/holder/HolderDashboard"));
const HolderDocuments = React.lazy(() => import("@/pages/holder/HolderDocuments"));
const DocumentDetail = React.lazy(() => import("@/pages/holder/DocumentDetail"));
const RequestDocument = React.lazy(() => import("@/pages/holder/RequestDocument"));
const HolderShareLinks = React.lazy(() => import("@/pages/holder/HolderShareLinks"));
const ManagerInbox = React.lazy(() => import("@/pages/manager/ManagerInbox"));
const DraftDocument = React.lazy(() => import("@/pages/manager/DraftDocument"));
const HRApprovalQueue = React.lazy(() => import("@/pages/hr/HRApprovalQueue"));
const HRReview = React.lazy(() => import("@/pages/hr/HRReview"));
const BulkIssuance = React.lazy(() => import("@/pages/hr/BulkIssuance"));
const AdminOnboarding = React.lazy(() => import("@/pages/admin/AdminOnboarding"));
const AdminMembers = React.lazy(() => import("@/pages/admin/AdminMembers"));
const AuditLogPage = React.lazy(() => import("@/pages/admin/AuditLogPage"));
const TalentSearch = React.lazy(() => import("@/pages/verifier/TalentSearch"));
const AnchorEngine = React.lazy(() => import("@/pages/verifier/AnchorEngine"));

const wrap = (node: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{node}</Suspense>;

export const routes: RouteObject[] = [
  { path: "/", element: wrap(<Landing />) },

  {
    path: "/auth",
    element: wrap(<Outlet />),
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },

  { path: "/verify/:token", element: wrap(<Verify />) },

  {
    path: "/",
    element: wrap(<ImplementAuth />),
    children: [
      { element: <AppShell />, children: [
        { path: "dashboard", element: <DashboardRedirect /> },

        // Holder
        { path: "holder", element: <HolderDashboard /> },
        { path: "holder/documents", element: <HolderDocuments /> },
        { path: "holder/documents/:id", element: <DocumentDetail /> },
        { path: "holder/request", element: <RequestDocument /> },
        { path: "holder/links", element: <HolderShareLinks /> },

        // Manager
        { path: "manager", element: <ManagerInbox /> },
        { path: "manager/draft", element: <DraftDocument /> },
        { path: "manager/draft/:id", element: <DraftDocument /> },

        // HR
        { path: "hr", element: <HRApprovalQueue /> },
        { path: "hr/review/:id", element: <HRReview /> },
        { path: "hr/bulk", element: <BulkIssuance /> },

        // Org Admin
        { path: "admin", element: <AdminOnboarding /> },
        { path: "admin/members", element: <AdminMembers /> },
        { path: "admin/audit", element: <AuditLogPage /> },

        // Verifier
        { path: "recruit", element: <TalentSearch /> },
        { path: "recruit/anchor", element: <AnchorEngine /> },

        // Cross
        { path: "profile", element: <Profile /> },
      ] },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
];
