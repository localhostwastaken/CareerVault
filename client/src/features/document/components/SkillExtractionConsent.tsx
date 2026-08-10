import { Checkbox } from '@/components/ui/checkbox'

interface SkillExtractionConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

// Opting into AI processing of a personal document deserves plain language about
// what it does and — just as important — what it does not do.
export function SkillExtractionConsent({ checked, onChange }: SkillExtractionConsentProps) {
  return (
    <label className="inset-well flex cursor-pointer items-start gap-3 p-3">
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5" />
      <span className="flex flex-col gap-1">
        <span className="text-label font-semibold text-foreground">Enable AI skill extraction</span>
        <span className="text-label text-muted-foreground">
          Lets CareerVault read skills from this document so recruiters can match you. You stay hidden until you
          separately opt into discovery.
        </span>
      </span>
    </label>
  )
}
