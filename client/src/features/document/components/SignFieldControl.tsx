import type { Control, ControllerRenderProps } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectNative } from '@/components/ui/select-native'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { SignField, SignFormValues } from '@/features/document/sign-config'
import { cn } from '@/lib/utils'

type Rhf = ControllerRenderProps<SignFormValues, string>

// readOnly rather than disabled: the value must still submit, stay copyable and stay
// in the tab order. It reads as a recorded fact, not a field awaiting input.
const LOCKED_INPUT = 'cursor-default bg-surface-2 text-muted-foreground focus-visible:border-input'

/**
 * What `FormControl` injects. It is a Radix `Slot`, so it clones its immediate child and
 * passes these down — but its immediate child here is this component, not the element. They
 * have to be forwarded by hand, and dropping them is silent: the field still looks right
 * while `FormLabel`'s htmlFor points at an id that exists nowhere, so the label is not
 * associated, clicking it focuses nothing, and the error text is never announced.
 */
interface SlotProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

function Control({ field, rhf, ...slot }: { field: SignField; rhf: Rhf } & SlotProps) {
  const value = typeof rhf.value === 'string' ? rhf.value : ''
  switch (field.control) {
    case 'textarea':
      return (
        <Textarea
          {...rhf}
          {...slot}
          value={value}
          rows={4}
          placeholder={field.placeholder}
          className="resize-none"
        />
      )
    case 'select':
      return (
        <SelectNative {...rhf} {...slot} value={value}>
          {!field.default && <option value="">Choose…</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectNative>
      )
    case 'money':
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">₹</span>
          <Input
            {...rhf}
            {...slot}
            value={value}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={field.placeholder ?? '0'}
            className="pl-7 tnum"
          />
        </div>
      )
    case 'date':
      return <Input {...rhf} {...slot} value={value} type="date" />
    case 'email':
      return (
        <Input
          {...rhf}
          {...slot}
          value={value}
          type="email"
          placeholder={field.placeholder}
          readOnly={field.locked}
          aria-readonly={field.locked}
          className={cn(field.locked && LOCKED_INPUT)}
        />
      )
    default:
      return (
        <Input
          {...rhf}
          {...slot}
          value={value}
          placeholder={field.placeholder}
          readOnly={field.locked}
          aria-readonly={field.locked}
          className={cn(field.locked && LOCKED_INPUT)}
        />
      )
  }
}

export function SignFieldControl({ field, control }: { field: SignField; control: Control<SignFormValues> }) {
  if (field.control === 'checkbox') {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: rhf }) => (
          <FormItem>
            <label className="flex cursor-pointer items-center gap-3">
              <FormControl>
                <Checkbox
                  name={rhf.name}
                  ref={rhf.ref}
                  onBlur={rhf.onBlur}
                  checked={rhf.value === true}
                  onChange={(e) => rhf.onChange(e.currentTarget.checked)}
                />
              </FormControl>
              <span className="text-body text-foreground">{field.label}</span>
            </label>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: rhf }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.optional && <span className="ml-1 text-label font-normal text-subtle">(optional)</span>}
            {field.locked && (
              <span className="ml-1.5 inline-flex items-center gap-1 align-middle text-micro text-subtle">
                <Lock className="size-3" />
                you
              </span>
            )}
          </FormLabel>
          <FormControl>
            <Control field={field} rhf={rhf} />
          </FormControl>
          {field.locked ? (
            <FormDescription>Taken from your account — you sign as yourself.</FormDescription>
          ) : (
            field.help && <FormDescription>{field.help}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
