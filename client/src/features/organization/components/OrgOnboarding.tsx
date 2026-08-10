import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { setActivePersona } from '@/features/auth/authSlice'
import { useRefreshAuthUser } from '@/features/auth/hooks'
import { useCreateOrganizationMutation } from '@/features/organization/api'
import { createOrgSchema, type CreateOrgValues } from '@/features/organization/schema'
import { useAppDispatch } from '@/hooks/useAuth'
import { notify, toastApiError } from '@/lib/notify'

// First-run org creation form. After creation the server adds the ORG_ADMIN
// membership; refreshUser() loads it into Redux and we adopt the ORG_ADMIN
// persona so the parent AdminOrganization switches to OrgSettings (which handles
// DNS verification and ongoing management).
export function OrgOnboarding() {
  const [createOrg, { isLoading }] = useCreateOrganizationMutation()
  const refreshUser = useRefreshAuthUser()
  const dispatch = useAppDispatch()
  const form = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
    mode: 'onBlur',
    defaultValues: { name: '', domain: '' },
  })

  const onCreate = async (values: CreateOrgValues) => {
    try {
      const created = await createOrg(values).unwrap()
      // Pull in the new ORG_ADMIN membership, then switch the active persona to it.
      // A HOLDER founder starts as HOLDER, so setUser's role-matched adoption can't
      // pick up the new org — adopt it explicitly (also persisted for hard refresh).
      await refreshUser()
      dispatch(setActivePersona({ role: 'ORG_ADMIN', organizationId: created.id }))
      notify.success('Organization created — verify your domain to start issuing documents.')
    } catch (error) {
      toastApiError(error, 'Could not create organization')
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Prove domain ownership to start issuing verified career documents.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreate)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Create organization
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
