import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectNative } from '@/components/ui/select-native'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useCreateJobOpeningMutation } from '@/features/recruiter/api'
import { createJobOpeningSchema, type CreateJobOpeningValues } from '@/features/recruiter/schema'
import type { Seniority } from '@/features/recruiter/types'
import { notify, toastApiError } from '@/lib/notify'

export function CreateJobOpeningDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [createJobOpening, { isLoading }] = useCreateJobOpeningMutation()
  const form = useForm<CreateJobOpeningValues>({
    resolver: zodResolver(createJobOpeningSchema),
    defaultValues: { title: '', description: '', requiredSkills: '', seniority: '', yearsExpMin: '' },
  })

  const onSubmit = async (values: CreateJobOpeningValues) => {
    try {
      await createJobOpening({
        title: values.title,
        description: values.description,
        requiredSkills: values.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        seniority: values.seniority ? (values.seniority as Seniority) : undefined,
        yearsExpMin: values.yearsExpMin ? Number(values.yearsExpMin) : undefined,
      }).unwrap()
      notify.success('Job opening created.')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not create the opening')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New job opening</DialogTitle>
          <DialogDescription>We embed it to match against consented talent.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Senior Backend Engineer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="resize-none" placeholder="What the role involves…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredSkills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required skills</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Python, AWS, Kubernetes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seniority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seniority</FormLabel>
                    <FormControl>
                      <SelectNative {...field}>
                        <option value="">Any</option>
                        <option value="JUNIOR">Junior</option>
                        <option value="MID">Mid</option>
                        <option value="SENIOR">Senior</option>
                        <option value="LEAD">Lead</option>
                      </SelectNative>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearsExpMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. years</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" placeholder="Any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Create opening
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
