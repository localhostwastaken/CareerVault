import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useListDocumentsQuery } from '@/features/document/api'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { useCreateShareLinkMutation } from '@/features/share-link/api'
import { createShareLinkSchema, type CreateShareLinkValues } from '@/features/share-link/schema'
import { notify, toastApiError } from '@/lib/notify'

interface CreateShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetDocumentId?: string | null
}

export function CreateShareLinkDialog({ open, onOpenChange, presetDocumentId }: CreateShareLinkDialogProps) {
  const navigate = useNavigate()
  const { data: documents } = useListDocumentsQuery()
  const [createShareLink, { isLoading }] = useCreateShareLinkMutation()
  const shareable = (documents ?? []).filter((d) => d.status === 'ISSUED' || d.status === 'ANCHORED')

  const form = useForm<CreateShareLinkValues>({
    resolver: zodResolver(createShareLinkSchema),
    defaultValues: { documentId: presetDocumentId ?? '', expiresInDays: '', maxViews: '' },
  })

  // Re-seed the form whenever the dialog opens (e.g. opened pre-filled from a document).
  useEffect(() => {
    if (open) form.reset({ documentId: presetDocumentId ?? '', expiresInDays: '', maxViews: '' })
  }, [open, presetDocumentId, form])

  const onSubmit = async (values: CreateShareLinkValues) => {
    try {
      const result = await createShareLink({
        documentId: values.documentId,
        expiresInDays: values.expiresInDays ? Number(values.expiresInDays) : undefined,
        maxViews: values.maxViews ? Number(values.maxViews) : undefined,
      }).unwrap()
      if (result.checkout) {
        const url = new URL(result.checkout.checkoutUrl)
        navigate(url.pathname + url.search, { state: { amountDollars: result.checkout.amount } })
      } else {
        notify.success('Share link created.')
        onOpenChange(false)
      }
    } catch (error) {
      toastApiError(error, 'Could not create the share link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create share link</DialogTitle>
          <DialogDescription>$1.99 per link — free for Premium subscribers.</DialogDescription>
        </DialogHeader>

        {shareable.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            You need an issued document before you can share one.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="documentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document</FormLabel>
                    <FormControl>
                      <SelectNative {...field}>
                        <option value="" disabled>
                          Select a document
                        </option>
                        {shareable.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {DOCUMENT_TYPE_LABEL[doc.type]} · {doc.organizationName}
                          </option>
                        ))}
                      </SelectNative>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires (days)</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" placeholder="Never" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxViews"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max views</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" placeholder="Unlimited" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="animate-spin" />}
                  Continue
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
