import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useSignDocumentMutation } from '@/features/document/api'
import { SIGN_FIELDS, buildSignSchema, outputKey, rupeesToPaise, signDefaults, type SignField, type SignFormValues } from '@/features/document/sign-config'
import { SignFieldControl } from '@/features/document/components/SignFieldControl'
import { SalarySummary } from '@/features/document/components/SalarySummary'
import type { DocumentDetail } from '@/features/document/types'
import { cn } from '@/lib/utils'
import { notify, toastApiError } from '@/lib/notify'

function buildContent(type: DocumentDetail['type'], values: SignFormValues): Record<string, unknown> {
  const stillEmployed = type === 'EXPERIENCE_LETTER' && values.letterKind === 'EXPERIENCE'
  const content: Record<string, unknown> = {}
  for (const field of SIGN_FIELDS[type]) {
    if (field.separationOnly && stillEmployed) continue
    const raw = values[field.name]
    if (field.control === 'money') {
      const paise = rupeesToPaise(raw)
      if (paise != null) content[outputKey(field)] = paise
    } else if (field.control === 'checkbox') {
      if (raw === true) content[field.name] = true
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      content[field.name] = raw.trim()
    }
  }
  return content
}

export function SignDocumentForm({ document }: { document: DocumentDetail }) {
  const navigate = useNavigate()
  const [sign, { isLoading }] = useSignDocumentMutation()
  const [showMore, setShowMore] = useState(false)
  const type = document.type

  const form = useForm<SignFormValues>({
    resolver: zodResolver(buildSignSchema(type)),
    defaultValues: signDefaults(type, document),
    mode: 'onBlur',
  })

  const letterKind = form.watch('letterKind')
  const stillEmployed = type === 'EXPERIENCE_LETTER' && letterKind === 'EXPERIENCE'
  const isVisible = (field: SignField) => !(field.separationOnly && stillEmployed)
  const defaultFields = SIGN_FIELDS[type].filter((f) => f.section !== 'more')
  const moreFields = SIGN_FIELDS[type].filter((f) => f.section === 'more' && isVisible(f))

  const onSubmit = async (values: SignFormValues) => {
    try {
      await sign({ id: document.id, contentJson: buildContent(type, values) }).unwrap()
      notify.success('Signed and sent to HR for approval.')
      navigate(`/app/documents/${document.id}`)
    } catch (error) {
      toastApiError(error, 'Could not sign the document')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {defaultFields.map((field) =>
          field.separationOnly && stillEmployed ? (
            <p key={field.name} className="inset-well p-4 text-body text-muted-foreground">
              Marked as still employed — no last working day is recorded.
            </p>
          ) : (
            <SignFieldControl key={field.name} field={field} control={form.control} />
          ),
        )}

        {type === 'SALARY_PROOF' && <SalarySummary control={form.control} />}

        {moreFields.length > 0 && (
          <div className="flex flex-col gap-5 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="focus-ring flex items-center gap-1.5 self-start rounded-lg text-label font-medium text-seal"
              aria-expanded={showMore}
            >
              <ChevronDown className={cn('size-4 transition-transform', showMore && 'rotate-180')} />
              {showMore ? 'Hide extra detail' : 'Add more detail'}
            </button>
            {showMore &&
              moreFields.map((field) => <SignFieldControl key={field.name} field={field} control={form.control} />)}
          </div>
        )}

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
