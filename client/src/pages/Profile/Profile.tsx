import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ShieldAlert, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { PasswordSection } from '@/features/auth/components/PasswordSection'
import { useDeleteAccountMutation } from '@/features/auth/authApi'
import { logout as logoutAction } from '@/features/auth/authSlice'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notify, toastApiError } from '@/lib/notify'

const ROLE_LABEL: Record<string, string> = {
  ORG_ADMIN: 'Admin',
  MANAGER: 'Manager',
  HR: 'HR',
  RECRUITER: 'Recruiter',
  HOLDER: 'Holder',
}

const Profile = () => {
  useDocumentTitle('Profile')
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteAccount, { isLoading }] = useDeleteAccountMutation()

  const onDelete = async () => {
    try {
      await deleteAccount().unwrap()
      dispatch(logoutAction())
      notify.success('Your account has been erased.')
      navigate('/auth/login', { replace: true })
    } catch (error) {
      toastApiError(error, 'Could not delete your account')
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <PageHeader title="Profile" description="Your account, sign-in method, and data." />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-label font-semibold text-primary-foreground">
            {(user?.fullName ?? '?')
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-h3 text-foreground">{user?.fullName ?? 'Account'}</p>
            <p className="flex items-center gap-1.5 text-label text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              {user?.email ?? '—'}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="label-micro mb-2">Roles</p>
          {user?.memberships.length ? (
            <div className="flex flex-wrap gap-1.5">
              {user.memberships.map((membership) => (
                <Badge key={`${membership.organizationId}-${membership.role}`} variant="primary">
                  {membership.organizationName} · {ROLE_LABEL[membership.role] ?? membership.role}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-label text-muted-foreground">
              <UserRound className="size-3.5" />
              Personal career wallet only — you're not a member of any organisation.
            </p>
          )}
        </div>
      </Card>

      <PasswordSection />

      <Section title="Danger zone">
        <Card className="border-revoked/30 bg-revoked-soft p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-revoked" />
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-label font-semibold text-revoked">Delete account</p>
                <p className="mt-1 text-body text-muted-foreground">
                  Erases your personal data and removes you from talent discovery. Documents already issued to you are
                  retained by the organisations that issued them, as their records require. This cannot be undone.
                </p>
              </div>
              <Button variant="destructive" className="self-start" onClick={() => setConfirmOpen(true)}>
                Delete my account
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        description="Your personal data is erased and you'll be signed out immediately. This cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Keep my account"
        isDestructive
        isLoading={isLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}

export default Profile
