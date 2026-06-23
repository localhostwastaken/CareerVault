import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ShieldAlert, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { PasswordSection } from '@/features/auth/components/PasswordSection'
import { useDeleteAccountMutation } from '@/features/auth/authApi'
import { logout as logoutAction } from '@/features/auth/authSlice'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { notify, toastApiError } from '@/lib/notify'

const Profile = () => {
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
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your CareerVault account details." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{user?.fullName ?? 'Account'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4" />
            {user?.email ?? '—'}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4" />
            {user?.memberships.length ? 'Organization member' : 'Holder'}
          </div>
          {user?.memberships.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {user.memberships.map((membership) => (
                <Badge key={`${membership.organizationId}-${membership.role}`} variant="primary">
                  {membership.organizationName} · {membership.role}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PasswordSection />

      <Card className="max-w-xl border-revoked/30 bg-revoked-soft/30 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-revoked" />
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground">Delete account</p>
              <p className="text-sm text-muted-foreground">
                Erases your personal data and removes you from talent discovery. Documents issued to
                you are retained by their organizations. This cannot be undone.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Delete my account
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        description="Your personal data is erased and you'll be signed out. This cannot be undone."
        confirmLabel="Delete account"
        isDestructive
        isLoading={isLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}

export default Profile
