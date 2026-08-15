import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useRequestDocumentMutation } from '@/features/document/api'
import { useHolderDuplicateRequest } from '@/features/document/hooks'
import { DocumentTypePicker } from '@/features/document/components/DocumentTypePicker'
import { ManagerSelectField } from '@/features/document/components/ManagerSelectField'
import { RequestAdvisories } from '@/features/document/components/RequestAdvisories'
import { RequestReviewDialog } from '@/features/document/components/RequestReviewDialog'
import { SkillExtractionConsent } from '@/features/document/components/SkillExtractionConsent'
import { requestDocumentSchema, type RequestDocumentValues } from '@/features/document/schema'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { useListVerifiedOrgsQuery, useListManagersQuery } from '@/features/organization/api'
import { useAuth } from '@/hooks/useAuth'
import { toastApiError } from '@/lib/notify'

const MAX_NOTES = 1000

export function RequestDocumentForm({ onSent }: { onSent: (document: DocumentDetail) => void }) {
  const { user } = useAuth()
  const { data: orgs, isLoading: orgsLoading } = useListVerifiedOrgsQuery()
  const [requestDocument, { isLoading }] = useRequestDocumentMutation()
  const [reviewOpen, setReviewOpen] = useState(false)
  const form = useForm<RequestDocumentValues>({
    resolver: zodResolver(requestDocumentSchema),
    mode: 'onBlur',
    defaultValues: {
      organizationId: '',
      type: 'EXPERIENCE_LETTER',
      managerUserId: '',
      notes: '',
      enableSkillExtraction: false,
    },
  })

  const orgId = form.watch('organizationId')
  const type = form.watch('type')
  const notes = form.watch('notes') ?? ''
  const { data: managers, isLoading: managersLoading } = useListManagersQuery(orgId, { skip: !orgId })
  const duplicate = useHolderDuplicateRequest(orgId, type)
  const noOrgs = !orgsLoading && (orgs?.length ?? 0) === 0
  const noManagers = Boolean(orgId) && !managersLoading && (managers?.length ?? 0) === 0
  const isMember = Boolean(orgId) && Boolean(user?.memberships.some((m) => m.organizationId === orgId))
  const selectedManager = managers?.find((m) => m.userId === form.watch('managerUserId'))

  // The review dialog is the last gate: sending is irreversible from the holder's side,
  // so the values are restated once before the mutation runs.
  const submit = async () => {
    try {
      const values = form.getValues()
      // Strip empty managerUserId so the server auto-assigns when none selected.
      onSent(await requestDocument({ ...values, managerUserId: values.managerUserId || undefined }).unwrap())
    } catch (error) {
      toastApiError(error, 'Could not send your request')
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => setReviewOpen(true))} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document type</FormLabel>
                <FormControl>
                  <DocumentTypePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organizationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organisation</FormLabel>
                <FormControl>
                  <SelectNative {...field} disabled={orgsLoading || noOrgs}>
                    <option value="" disabled>
                      {orgsLoading ? 'Loading organisations…' : 'Select an organisation'}
                    </option>
                    {orgs?.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </SelectNative>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Manager choice only appears once an org is picked — progressive disclosure. */}
          {orgId && (
            <ManagerSelectField
              control={form.control}
              managers={managers}
              isLoading={managersLoading}
              description={isMember ? "You're a member here — the request may be routed to you to sign." : undefined}
            />
          )}

          <RequestAdvisories noOrgs={noOrgs} noManagers={noManagers} duplicate={duplicate} type={type} />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    maxLength={MAX_NOTES}
                    placeholder="Anything the issuer should know — role, dates, purpose…"
                    className="resize-none"
                  />
                </FormControl>
                <FormDescription>Optional. Shared with the organisation to help them prepare it.</FormDescription>
                <div className="flex items-center justify-between">
                  <FormMessage />
                  <span className="tnum ml-auto text-micro text-subtle">
                    {notes.length}/{MAX_NOTES}
                  </span>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enableSkillExtraction"
            render={({ field }) => (
              <FormItem>
                <SkillExtractionConsent checked={field.value ?? false} onChange={field.onChange} />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || noManagers || (Boolean(orgId) && managersLoading)}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            Review &amp; send
          </Button>
        </form>
      </Form>

      <RequestReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onConfirm={submit}
        isLoading={isLoading}
        typeLabel={DOCUMENT_TYPE_LABEL[type]}
        orgName={orgs?.find((o) => o.id === orgId)?.name ?? '—'}
        managerName={selectedManager ? selectedManager.user.fullName : 'Any available manager'}
        note={notes.trim() || undefined}
      />
    </>
  )
}
