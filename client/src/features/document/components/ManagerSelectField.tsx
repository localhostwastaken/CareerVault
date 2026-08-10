import type { Control } from 'react-hook-form'
import { SelectNative } from '@/components/ui/select-native'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { RequestDocumentValues } from '@/features/document/schema'

interface ManagerOption {
  userId: string
  user: { fullName: string }
}

interface ManagerSelectFieldProps {
  control: Control<RequestDocumentValues>
  managers: ManagerOption[] | undefined
  isLoading: boolean
}

// Only meaningful once an organisation is chosen, so the caller mounts it lazily.
export function ManagerSelectField({ control, managers, isLoading }: ManagerSelectFieldProps) {
  return (
    <FormField
      control={control}
      name="managerUserId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Manager</FormLabel>
          <FormControl>
            <SelectNative {...field} disabled={isLoading}>
              <option value="">{isLoading ? 'Loading managers…' : 'Any available manager'}</option>
              {managers?.map((manager) => (
                <option key={manager.userId} value={manager.userId}>
                  {manager.user.fullName}
                </option>
              ))}
            </SelectNative>
          </FormControl>
          <FormDescription>Optional — left blank, the organisation assigns one.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
