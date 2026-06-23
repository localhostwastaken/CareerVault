import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { SelectNative } from '@/components/ui/select-native'
import { useResubmitDocumentMutation } from '@/features/document/api'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail, type DocumentType } from '@/features/document/types'
import { useListManagersQuery } from '@/features/organization/api'
import { notify, toastApiError } from '@/lib/notify'

interface Props {
  document: DocumentDetail
}

export function ResubmitForm({ document }: Props) {
  const [resubmit, { isLoading }] = useResubmitDocumentMutation()
  const { data: managers, isLoading: managersLoading } = useListManagersQuery(document.organizationId)

  const form = useForm({
    defaultValues: { type: document.type, managerUserId: '', notes: '' },
  })

  const onSubmit = async (values: { type: string; managerUserId: string; notes: string }) => {
    try {
      const payload: Record<string, string> = {}
      if (values.type !== document.type) payload.type = values.type
      if (values.managerUserId) payload.managerUserId = values.managerUserId
      if (values.notes) payload.notes = values.notes
      if (Object.keys(payload).length === 0) {
        notify.info('No changes made.')
        return
      }
      await resubmit({ id: document.id, ...payload }).unwrap()
      notify.success('Request resubmitted — the manager has been notified.')
    } catch (error) {
      toastApiError(error, 'Could not resubmit')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-5" />
          Edit &amp; resubmit
        </CardTitle>
        <CardDescription>
          Update your request and send it back to the manager.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document type</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                        <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managerUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager (optional)</FormLabel>
                  <FormControl>
                    <SelectNative {...field} disabled={managersLoading}>
                      <option value="">Same as before</option>
                      {managers?.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.user.fullName}</option>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="What changed?" className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              Resubmit
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
