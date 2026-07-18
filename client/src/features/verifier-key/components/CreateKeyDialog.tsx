import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { notify, toastApiError } from '@/lib/notify'
import { useCreateVerifierKeyMutation } from '../api'
import { createVerifierKeySchema, type CreateVerifierKeyValues } from '../schema'

interface CreateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateKeyDialog({ open, onOpenChange }: CreateKeyDialogProps) {
  const [createKey, { isLoading }] = useCreateVerifierKeyMutation()
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const form = useForm<CreateVerifierKeyValues>({
    resolver: zodResolver(createVerifierKeySchema),
    defaultValues: { name: '' },
  })

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRevealedKey(null)
      setCopied(false)
      form.reset({ name: '' })
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = async (values: CreateVerifierKeyValues) => {
    try {
      const result = await createKey({ name: values.name || undefined }).unwrap()
      setRevealedKey(result.apiKey)
    } catch (error) {
      toastApiError(error, 'Could not create the API key')
    }
  }

  const copyKey = async () => {
    if (!revealedKey) return
    await navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    notify.success('Copied to clipboard.')
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{revealedKey ? 'API key created' : 'New API key'}</DialogTitle>
          <DialogDescription>
            {revealedKey
              ? "Copy this key now — it won't be shown again."
              : 'Give the key an optional name to tell it apart later.'}
          </DialogDescription>
        </DialogHeader>

        {revealedKey ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-3">
            <code className="tnum flex-1 overflow-x-auto text-xs text-foreground">{revealedKey}</code>
            <Button type="button" size="icon" variant="secondary" onClick={copyKey}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. HR onboarding system" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="animate-spin" />}
                  Create key
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
