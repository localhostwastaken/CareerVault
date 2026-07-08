import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DOCUMENT_TYPE_LABEL } from '@/features/document/types'
import { notify, toastApiError } from '@/lib/notify'
import { useUploadBulkIssuanceMutation } from '../api'
import { bulkIssuanceSchema, type BulkIssuanceValues } from '../schema'

const TYPES = ['EXPERIENCE_LETTER', 'SALARY_PROOF'] as const

export function BulkUploadForm({ organizationId }: { organizationId: string }) {
  const [upload, { isLoading }] = useUploadBulkIssuanceMutation()
  const form = useForm<BulkIssuanceValues>({
    resolver: zodResolver(bulkIssuanceSchema),
    defaultValues: { documentType: 'EXPERIENCE_LETTER' },
  })

  const onSubmit = async (values: BulkIssuanceValues) => {
    try {
      await upload({ organizationId, documentType: values.documentType, file: values.file }).unwrap()
      notify.success('Batch queued — issuing documents now.')
      form.reset({ documentType: values.documentType, file: undefined })
    } catch (error) {
      toastApiError(error, 'Could not start the bulk batch')
    }
  }

  return (
    <Card className="p-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <FormField
            control={form.control}
            name="documentType"
            render={({ field }) => (
              <FormItem className="sm:w-56">
                <FormLabel>Document type</FormLabel>
                <FormControl>
                  <SelectNative {...field}>
                    {TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DOCUMENT_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </SelectNative>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file"
            render={({ field: { onChange, onBlur, name, ref } }) => (
              <FormItem className="flex-1">
                <FormLabel>Employee CSV</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".csv"
                    name={name}
                    ref={ref}
                    onBlur={onBlur}
                    onChange={(event) => onChange(event.target.files?.[0])}
                    className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
            Issue batch
          </Button>
        </form>
      </Form>
    </Card>
  )
}
