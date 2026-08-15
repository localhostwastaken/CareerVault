import type { Control } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { CreateShareLinkValues } from '@/features/share-link/schema'

// Both limits are optional; the placeholders state the default rather than leaving
// the user to guess what an empty field means.
export function ShareLinkLimitFields({ control }: { control: Control<CreateShareLinkValues> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="expiresInDays"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expires after</FormLabel>
            <FormControl>
              <Input {...field} inputMode="numeric" placeholder="Never" />
            </FormControl>
            <FormDescription>Days</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="maxViews"
        render={({ field }) => (
          <FormItem>
            <FormLabel>View limit</FormLabel>
            <FormControl>
              <Input {...field} inputMode="numeric" placeholder="Unlimited" />
            </FormControl>
            <FormDescription>Times it can be opened</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
