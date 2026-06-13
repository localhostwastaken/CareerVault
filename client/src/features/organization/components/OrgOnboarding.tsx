import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { useRefreshAuthUser } from '@/features/auth/hooks'
import { useCreateOrganizationMutation, useVerifyDomainMutation } from '@/features/organization/api'
import { createOrgSchema, type CreateOrgValues } from '@/features/organization/schema'
import type { CreateOrgResponse } from '@/features/organization/types'
import { notify, toastApiError } from '@/lib/notify'

export function OrgOnboarding() {
  const [createOrg, { isLoading }] = useCreateOrganizationMutation()
  const [verifyDomain, { isLoading: verifying }] = useVerifyDomainMutation()
  const refreshUser = useRefreshAuthUser()
  const [created, setCreated] = useState<CreateOrgResponse | null>(null)
  const form = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', domain: '' },
  })

  const onCreate = async (values: CreateOrgValues) => {
    try {
      setCreated(await createOrg(values).unwrap())
    } catch (error) {
      toastApiError(error, 'Could not create organization')
    }
  }

  const onVerify = async () => {
    if (!created) return
    try {
      await verifyDomain(created.id).unwrap()
      await refreshUser()
      notify.success('Domain verified — your organization is ready')
    } catch (error) {
      toastApiError(error, 'Domain verification failed')
    }
  }

  if (created) {
    return (
      <Card className="max-w-xl shadow-raised">
        <CardHeader>
          <CardTitle>Verify {created.domain}</CardTitle>
          <CardDescription>
            Add this TXT record to your domain's DNS, then verify. (Dev mode bypasses the lookup.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">DNS TXT record</span>
            <HashDisplay value={created.verificationTxtRecord} lead={48} tail={6} className="w-full justify-between" />
          </div>
          <Button onClick={onVerify} disabled={verifying}>
            {verifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Verify domain
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl shadow-raised">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Prove domain ownership to start issuing verified career documents.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
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
