import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import ImplementAuth from '@/components/ImplementAuth'
import LoadingScreen from '@/components/LoadingScreen'
import { RoleHomeRedirect } from '@/components/RoleHomeRedirect'
import { RoleGate } from '@/components/RoleGate'
import { ComingSoon } from '@/components/shared/ComingSoon'
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
const Register = lazy(() => import('@/pages/Register/Register'))
const Profile = lazy(() => import('@/pages/Profile/Profile'))
const AdminOrganization = lazy(() => import('@/pages/Admin/Organization'))
const AdminMembers = lazy(() => import('@/pages/Admin/Members'))
const AdminAnalytics = lazy(() => import('@/pages/Admin/Analytics'))
const HolderWallet = lazy(() => import('@/pages/Holder/Wallet'))
const HolderDocuments = lazy(() => import('@/pages/Holder/Documents'))
const HolderRequestDocument = lazy(() => import('@/pages/Holder/RequestDocument'))
const HolderDocumentDetail = lazy(() => import('@/pages/Holder/DocumentDetail'))
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

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
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
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: suspense(<Login />) },
      { path: 'magic', element: suspense(<MagicLink />) },
      { path: 'register', element: suspense(<Register />) },
    ],
  },
  {
    path: '/app',
    element: <ImplementAuth />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <RoleHomeRedirect /> },
          { path: 'profile', element: suspense(<Profile />) },
          { path: 'request', element: suspense(<HolderRequestDocument />) },
          { path: 'documents/:id', element: suspense(<HolderDocumentDetail />) },
          { path: 'documents/:id/sign', element: suspense(<ManagerSignDocument />) },
          ...featureRoutes,
        ],
      },
    ],
  },
  { path: '/payments/mock', element: suspense(<MockCheckout />) },
  { path: '*', element: <Navigate to="/" replace /> },
]
