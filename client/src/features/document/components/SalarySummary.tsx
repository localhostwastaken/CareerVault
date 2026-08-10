import { type Control, useWatch } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { formatInr } from '@/lib/format'
import {
  SALARY_DEDUCTION_KEYS,
  SALARY_EARNING_KEYS,
  rupeesToPaise,
  type SignFormValues,
} from '@/features/document/sign-config'

const sum = (values: SignFormValues, keys: readonly string[]): number =>
  keys.reduce((total, key) => total + (rupeesToPaise(values[key]) ?? 0), 0)

// Live preview only. content-validation.ts is the sole author of the stored totals, so
// this never claims to be authoritative — it just helps the signer sanity-check net pay.
export function SalarySummary({ control }: { control: Control<SignFormValues> }) {
  const values = useWatch({ control }) as SignFormValues
  const gross = sum(values, SALARY_EARNING_KEYS)
  const deductions = sum(values, SALARY_DEDUCTION_KEYS)
  const net = gross - deductions

  return (
    <div className="inset-well flex flex-wrap items-baseline gap-x-6 gap-y-2 p-4">
      <Line label="Gross" amount={gross} />
      <Line label="Deductions" amount={deductions} />
      <Line label="Net" amount={net} tone={net < 0 ? 'revoked' : 'strong'} />
    </div>
  )
}

function Line({ label, amount, tone = 'muted' }: { label: string; amount: number; tone?: 'muted' | 'strong' | 'revoked' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="label-micro">{label}</span>
      <span
        className={cn(
          'tnum text-body-lg',
          tone === 'revoked' ? 'text-revoked' : tone === 'strong' ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {formatInr(amount)}
      </span>
    </div>
  )
}
