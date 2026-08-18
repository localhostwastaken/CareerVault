import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { GuestOnly } from '@/components/GuestOnly'
import LoadingScreen from '@/components/LoadingScreen'
import { RequireAuth } from '@/components/RequireAuth'
import { RoleHomeRedirect } from '@/components/RoleHomeRedirect'
import { RoleGate } from '@/components/RoleGate'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary'
import { PortalLayout } from '@/layouts/PortalLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ROLE_CONFIG } from '@/lib/roles'
import type { AppRole } from '@/features/auth/types'

const Hero = lazy(() => import('@/pages/Hero/Hero'))
const VerifyHome = lazy(() => import('@/pages/Verify/VerifyHome'))
const VerifyResult = lazy(() => import('@/pages/Verify/VerifyResult'))
const MockCheckout = lazy(() => import('@/pages/Payments/MockCheckout'))
const Login = lazy(() => import('@/pages/Login/Login'))
const MagicLink = lazy(() => import('@/pages/MagicLink/MagicLink'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword/ResetPassword'))
const Register = lazy(() => import('@/pages/Register/Register'))
const Profile = lazy(() => import('@/pages/Profile/Profile'))
const AdminOrganization = lazy(() => import('@/pages/Admin/Organization'))
const AdminMembers = lazy(() => import('@/pages/Admin/Members'))
const AdminAnalytics = lazy(() => import('@/pages/Admin/Analytics'))
const HolderWallet = lazy(() => import('@/pages/Holder/Wallet'))
const HolderDocuments = lazy(() => import('@/pages/Holder/Documents'))
const HolderRequestDocument = lazy(() => import('@/pages/Holder/RequestDocument'))
const DocumentDetail = lazy(() => import('@/pages/Documents/DocumentDetail'))
const HolderShareLinks = lazy(() => import('@/pages/Holder/ShareLinks'))
const HolderBilling = lazy(() => import('@/pages/Holder/Billing'))
const HolderVerifierApi = lazy(() => import('@/pages/Holder/VerifierApi'))
const HolderTalentProfile = lazy(() => import('@/pages/Holder/TalentProfile'))
const RecruiterTalentSearch = lazy(() => import('@/pages/Recruiter/TalentSearch'))
const RecruiterMatches = lazy(() => import('@/pages/Recruiter/Matches'))
const ManagerInbox = lazy(() => import('@/pages/Manager/Inbox'))
const ManagerSigned = lazy(() => import('@/pages/Manager/Signed'))
const ManagerSignDocument = lazy(() => import('@/pages/Manager/SignDocument'))
const HrApprovals            = lazy(() => import('@/pages/HR/Approvals'))
const HrBulkIssuance         = lazy(() => import('@/pages/HR/BulkIssuance'))
const HrIssued               = lazy(() => import('@/pages/HR/Issued'))
const AdminAuditLog          = lazy(() => import('@/pages/Admin/AuditLog'))

const suspense = (node: ReactNode): ReactNode => <Suspense fallback={<LoadingScreen />}>{node}</Suspense>

// Screens implemented so far; remaining nav targets fall back to ComingSoon until their phase.
const IMPLEMENTED: Record<string, ReactNode> = {
  org: suspense(<AdminOrganization />),
  members: suspense(<AdminMembers />),
  analytics:     suspense(<AdminAnalytics />),
  audit:         suspense(<AdminAuditLog />),
  wallet: suspense(<HolderWallet />),
  documents: suspense(<HolderDocuments />),
  inbox: suspense(<ManagerInbox />),
  signed: suspense(<ManagerSigned />),
  approvals: suspense(<HrApprovals />),
  bulk: suspense(<HrBulkIssuance />),
  issued: suspense(<HrIssued />),
  'share-links': suspense(<HolderShareLinks />),
  billing: suspense(<HolderBilling />),
  'verifier-api': suspense(<HolderVerifierApi />),
  skills: suspense(<HolderTalentProfile />),
  talent: suspense(<RecruiterTalentSearch />),
  matches: suspense(<RecruiterMatches />),
}

// Which role owns each nav target — used to guard feature routes against direct-URL
// access by a different role (the server also enforces this, this is the UX layer).
const ROUTE_ROLE: Record<string, AppRole> = {}
for (const [role, config] of Object.entries(ROLE_CONFIG)) {
  for (const item of config.nav) {
    const key = item.to.replace('/app/', '')
    if (!(key in ROUTE_ROLE)) ROUTE_ROLE[key] = role as AppRole
  }
}

// Every role's nav target becomes a walkable route, gated to its owning role.
const featureRoutes: RouteObject[] = Array.from(
  new Map(
    Object.values(ROLE_CONFIG)
      .flatMap((config) => config.nav)
      .map((item) => [item.to, item]),
  ).values(),
).map((item) => {
  const key = item.to.replace('/app/', '')
  // Unaffiliated users (no membership → primaryRole=HOLDER) must be able to reach the
  // org creation page. The server allows any authenticated user to create an org; the
  // page itself shows onboarding vs settings based on membership state.
  const allow: AppRole | AppRole[] = key === 'org' ? ['ORG_ADMIN', 'HOLDER'] : ROUTE_ROLE[key]
  return {
    path: key,
    element: <RoleGate allow={allow}>{IMPLEMENTED[key] ?? <ComingSoon title={item.label} />}</RoleGate>,
  }
})

// Every layout route carries an errorElement so a throw inside one screen degrades
// to a recoverable page within that shell, instead of blanking the whole app.
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: suspense(<Hero />) },
      { path: '/verify', element: suspense(<VerifyHome />) },
      { path: '/verify/hash/:hash', element: suspense(<VerifyResult />) },
      { path: '/verify/:token', element: suspense(<VerifyResult />) },
    ],
  },
  {
    path: '/auth',
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'magic', element: suspense(<MagicLink />) },
      { path: 'forgot-password', element: suspense(<ForgotPassword />) },
      // Target of the emailed reset link (…/auth/reset-password?token=…) — the path
      // is fixed by the server's email template, so don't rename it.
      { path: 'reset-password', element: suspense(<ResetPassword />) },
      // Sign-in and sign-up are the only auth routes a signed-in user should be moved
      // off — and the only ones that must not paint before the session is resolved.
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', element: suspense(<Login />) },
          { path: 'register', element: suspense(<Register />) },
        ],
      },
    ],
  },
  {
    path: '/app',
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PortalLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <RoleHomeRedirect /> },
          { path: 'profile', element: suspense(<Profile />) },
          { path: 'request', element: suspense(<HolderRequestDocument />) },
          // Detail is intentionally open to any signed-in persona — the server decides
          // who may READ a given document, and holders reach their own this way.
          { path: 'documents/:id', element: suspense(<DocumentDetail />) },
          // Signing is not: only a MANAGER persona may open the drafting surface. Without
          // this gate a holder could walk through "signing" their own credential and only
          // discover it was never allowed when the submit 403'd.
          {
            path: 'documents/:id/sign',
            element: <RoleGate allow="MANAGER">{suspense(<ManagerSignDocument />)}</RoleGate>,
          },
          ...featureRoutes,
        ],
      },
    ],
  },
  // Checkout needs a session but not the portal shell, so it reuses the same guard as
  // /app rather than re-implementing one inline.
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [{ path: '/payments/mock', element: suspense(<MockCheckout />) }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
