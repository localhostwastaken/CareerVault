import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { useAddMemberMutation } from '@/features/member/api'
import { addMemberSchema, type AddMemberValues } from '@/features/member/schema'
import { notify, toastApiError } from '@/lib/notify'

export function AddMemberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  const [addMember, { isLoading }] = useAddMemberMutation()
  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    mode: 'onBlur',
    defaultValues: { email: '', role: 'MANAGER', fullName: '' },
  })

  const onSubmit = async (values: AddMemberValues) => {
    try {
      // The server's fullName is @IsOptional() @MinLength(2): that only skips validation for an omitted key, not an empty string, so leaving this optional field blank (its default value) 400'd every time. Omit it instead of sending ''.
      await addMember({
        orgId,
        email: values.email,
        role: values.role,
        fullName: values.fullName?.trim() || undefined,
      }).unwrap()
      notify.success('Member added')
      form.reset()
      setOpen(false)
    } catch (error) {
      toastApiError(error, 'Could not add member')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="person@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      <option value="MANAGER">Manager</option>
                      <option value="HR">HR</option>
                      <option value="RECRUITER">Recruiter</option>
                      <option value="ORG_ADMIN">Org Admin</option>
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
