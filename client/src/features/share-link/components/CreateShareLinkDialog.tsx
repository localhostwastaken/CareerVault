import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { ShareLinkLimitFields } from '@/features/share-link/components/ShareLinkLimitFields'
import { ErrorState } from '@/components/shared/ErrorState'
import { useListDocumentsQuery } from '@/features/document/api'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { useCreateShareLinkMutation } from '@/features/share-link/api'
import { createShareLinkSchema, type CreateShareLinkValues } from '@/features/share-link/schema'
import type { ShareLink } from '@/features/share-link/types'
import { toastApiError } from '@/lib/notify'

interface CreateShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetDocumentId?: string | null
  /** Hands the new link to the page so it can show the Act III panel. */
  onCreated?: (link: ShareLink) => void
}

export function CreateShareLinkDialog({ open, onOpenChange, presetDocumentId, onCreated }: CreateShareLinkDialogProps) {
  const navigate = useNavigate()
  // Same query arg as Wallet/Documents so this shares their cache entry — a bare
  // useListDocumentsQuery() is a *different* entry and always starts cold, which made
  // the dialog claim "no issued documents" while its own request was still in flight.
  const documentsQuery = useListDocumentsQuery({ role: 'HOLDER' })
  const [createShareLink, { isLoading }] = useCreateShareLinkMutation()
  const shareable = (documentsQuery.data ?? []).filter((d) => d.status === 'ISSUED' || d.status === 'ANCHORED')

  const form = useForm<CreateShareLinkValues>({
    resolver: zodResolver(createShareLinkSchema),
    mode: 'onBlur',
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
        // Carry the link through checkout so the user still gets the Act III panel
        // once they return — the paid path is the default for non-premium holders.
        navigate(url.pathname + url.search, {
          state: { amountDollars: result.checkout.amount, shareLink: result.shareLink },
        })
      } else {
        onOpenChange(false)
        onCreated?.(result.shareLink)
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

        {documentsQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-body text-muted-foreground" aria-busy="true">
            <Loader2 className="size-4 animate-spin" />
            Loading your documents…
          </div>
        ) : documentsQuery.isError ? (
          <ErrorState
            headingLevel={3}
            title="Couldn't load your documents"
            error={documentsQuery.error}
            onRetry={documentsQuery.refetch}
          />
        ) : shareable.length === 0 ? (
          <p className="py-4 text-body text-muted-foreground">You need an issued document before you can share one.</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
              <ShareLinkLimitFields control={form.control} />
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
