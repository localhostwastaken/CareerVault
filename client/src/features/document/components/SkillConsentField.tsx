// Consent to AI skill extraction for talent matching. Set once at request time; the
// server reads it only at issuance, so it can't be toggled after the request is sent.
export function SkillConsentField({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span className="text-sm">
        <span className="font-medium text-foreground">Enable AI skill extraction</span>
        <span className="mt-0.5 block text-muted-foreground">
          Let CareerVault extract skills from the issued document so recruiters can match you. This is set now and can't
          change after sending. You stay hidden until you opt into discovery.
        </span>
      </span>
    </label>
  )
}
