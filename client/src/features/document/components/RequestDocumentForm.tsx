import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Notice } from '@/components/shared/Notice'
import { ManagerSelectField } from '@/features/document/components/ManagerSelectField'
import { SkillExtractionConsent } from '@/features/document/components/SkillExtractionConsent'
import { useRequestDocumentMutation } from '@/features/document/api'
import { requestDocumentSchema, type RequestDocumentValues } from '@/features/document/schema'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail, type DocumentType } from '@/features/document/types'
import { useListVerifiedOrgsQuery, useListManagersQuery } from '@/features/organization/api'
import { toastApiError } from '@/lib/notify'

export function RequestDocumentForm({ onSent }: { onSent: (document: DocumentDetail) => void }) {
  const { data: orgs, isLoading: orgsLoading } = useListVerifiedOrgsQuery()
  const [requestDocument, { isLoading }] = useRequestDocumentMutation()

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

  const selectedOrgId = form.watch('organizationId')
  const { data: managers, isLoading: managersLoading } = useListManagersQuery(selectedOrgId, { skip: !selectedOrgId })
  const noManagers = Boolean(selectedOrgId) && !managersLoading && managers?.length === 0

  const onSubmit = async (values: RequestDocumentValues) => {
    try {
      // Strip empty managerUserId so the server auto-assigns when none selected.
      const payload = { ...values, managerUserId: values.managerUserId || undefined }
      onSent(await requestDocument(payload).unwrap())
    } catch (error) {
      toastApiError(error, 'Could not send your request')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="organizationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisation</FormLabel>
              <FormControl>
                <SelectNative {...field} disabled={orgsLoading}>
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

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <SelectNative {...field}>
                  {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </SelectNative>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Manager choice only appears once an org is picked — progressive disclosure. */}
        {selectedOrgId && (
          <ManagerSelectField control={form.control} managers={managers} isLoading={managersLoading} />
        )}

        {noManagers && (
          <Notice tone="pending" title="This organisation has no managers yet">
            Nobody there can sign a request right now. Pick a different organisation, or contact them directly.
          </Notice>
        )}

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
                  placeholder="Anything the issuer should know — role, dates, purpose…"
                  className="resize-none"
                />
              </FormControl>
              <FormDescription>Optional. Shared with the organisation to help them prepare it.</FormDescription>
              <FormMessage />
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

        <Button type="submit" className="w-full" disabled={isLoading || noManagers}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          Send request
        </Button>
      </form>
    </Form>
  )
}
