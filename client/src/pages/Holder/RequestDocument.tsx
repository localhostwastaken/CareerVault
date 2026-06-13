import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PageHeader } from '@/components/shared/PageHeader'
import { useRequestDocumentMutation } from '@/features/document/api'
import { requestDocumentSchema, type RequestDocumentValues } from '@/features/document/schema'
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '@/features/document/types'
import { useListVerifiedOrgsQuery } from '@/features/organization/api'
import { notify, toastApiError } from '@/lib/notify'

const HolderRequestDocument = () => {
  const navigate = useNavigate()
  const { data: orgs, isLoading: orgsLoading } = useListVerifiedOrgsQuery()
  const [requestDocument, { isLoading }] = useRequestDocumentMutation()

  const form = useForm<RequestDocumentValues>({
    resolver: zodResolver(requestDocumentSchema),
    defaultValues: { organizationId: '', type: 'EXPERIENCE_LETTER', notes: '', enableSkillExtraction: false },
  })

  const onSubmit = async (values: RequestDocumentValues) => {
    try {
      const document = await requestDocument(values).unwrap()
      notify.success('Request sent — the organization will be notified.')
      navigate(`/app/documents/${document.id}`)
    } catch (error) {
      toastApiError(error, 'Could not send your request')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
      </Button>
      <PageHeader title="Request a document" description="Ask a verified organization to issue you a tamper-evident document." />

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <SelectNative {...field} disabled={orgsLoading}>
                        <option value="" disabled>
                          {orgsLoading ? 'Loading organizations…' : 'Select an organization'}
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Anything the issuer should know — role, dates, purpose…"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormDescription>Shared with the organization to help them prepare your document.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableSkillExtraction"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="text-sm">
                        <span className="font-medium text-foreground">Enable AI skill extraction</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          Let CareerVault extract skills from this document so recruiters can match you. You stay
                          hidden until you opt into discovery.
                        </span>
                      </span>
                    </label>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                Send request
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default HolderRequestDocument
