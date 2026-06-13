import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useSignDocumentMutation } from '@/features/document/api'
import { SIGN_FIELDS, buildSignSchema, signDefaults, type SignFormValues } from '@/features/document/sign-config'
import type { DocumentDetail } from '@/features/document/types'
import { notify, toastApiError } from '@/lib/notify'

export function SignDocumentForm({ document }: { document: DocumentDetail }) {
  const navigate = useNavigate()
  const [sign, { isLoading }] = useSignDocumentMutation()
  const fields = SIGN_FIELDS[document.type]

  const form = useForm<SignFormValues>({
    resolver: zodResolver(buildSignSchema(document.type)),
    defaultValues: signDefaults(document.type, document.contentJson),
  })

  const onSubmit = async (values: SignFormValues) => {
    const credentialSubject: Record<string, string> = {}
    for (const [key, value] of Object.entries(values)) {
      if (value?.trim()) credentialSubject[key] = value.trim()
    }
    // Preserve the holder's request note at the root; the renderer only reads credentialSubject.
    const note = document.contentJson.note
    const contentJson =
      typeof note === 'string' && note ? { credentialSubject, requestNote: note } : { credentialSubject }
    try {
      await sign({ id: document.id, contentJson }).unwrap()
      notify.success('Signed and sent to HR for approval.')
      navigate(`/app/documents/${document.id}`)
    } catch (error) {
      toastApiError(error, 'Could not sign the document')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: rhf }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.optional && <span className="ml-1 text-xs font-normal text-subtle">(optional)</span>}
                </FormLabel>
                <FormControl>
                  {field.control === 'textarea' ? (
                    <Textarea {...rhf} rows={4} placeholder={field.placeholder} className="resize-none" />
                  ) : (
                    <Input
                      {...rhf}
                      type={field.control === 'date' ? 'date' : field.control === 'number' ? 'number' : 'text'}
                      placeholder={field.placeholder}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <PenLine />}
            Sign &amp; send to HR
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
