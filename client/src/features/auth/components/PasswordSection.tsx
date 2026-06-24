import { useForm, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useChangePasswordMutation, useSetPasswordMutation } from '@/features/auth/authApi'
import { setUser } from '@/features/auth/authSlice'
import { useAppDispatch, useAuth } from '@/hooks/useAuth'
import { notify, toastApiError } from '@/lib/notify'

const setSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const changeSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type SetValues = z.infer<typeof setSchema>
type ChangeValues = z.infer<typeof changeSchema>

export function PasswordSection() {
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [setPassword, { isLoading: isSetting }] = useSetPasswordMutation()
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation()

  const setForm = useForm<SetValues>({
    resolver: zodResolver(setSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const changeForm = useForm<ChangeValues>({
    resolver: zodResolver(changeSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirm: '' },
  })

  const onSetPassword = async (values: SetValues) => {
    try {
      const updated = await setPassword({ password: values.password }).unwrap()
      dispatch(setUser(updated))
      setForm.reset()
      notify.success('Password set — you can now sign in with it.')
    } catch (error) {
      toastApiError(error, 'Could not set password')
    }
  }

  const onChangePassword = async (values: ChangeValues) => {
    try {
      const updated = await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      }).unwrap()
      dispatch(setUser(updated))
      changeForm.reset()
      notify.success('Password changed.')
    } catch (error) {
      toastApiError(error, 'Could not change password')
    }
  }

  if (!user) return null

  const field = <T extends FieldValues>(
    control: Control<T>,
    name: FieldPath<T>,
    label: string,
    autoComplete: string,
  ) => (
    <FormField
      control={control}
      name={name}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="password" autoComplete={autoComplete} placeholder="••••••••" {...f} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5" />
          {user.hasPassword ? 'Change password' : 'Set a password'}
        </CardTitle>
        <CardDescription>
          {user.hasPassword
            ? 'Enter your current password and choose a new one.'
            : 'Your account was created without a password. Set one so you can sign in without a magic link.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user.hasPassword ? (
          <Form {...changeForm}>
            <form onSubmit={changeForm.handleSubmit(onChangePassword)} className="space-y-4">
              {field(changeForm.control, 'oldPassword', 'Current password', 'current-password')}
              {field(changeForm.control, 'newPassword', 'New password', 'new-password')}
              {field(changeForm.control, 'confirm', 'Confirm new password', 'new-password')}
              <Button type="submit" disabled={isChanging}>
                {isChanging && <Loader2 className="animate-spin" />}
                Change password
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...setForm}>
            <form onSubmit={setForm.handleSubmit(onSetPassword)} className="space-y-4">
              {field(setForm.control, 'password', 'New password', 'new-password')}
              {field(setForm.control, 'confirm', 'Confirm password', 'new-password')}
              <Button type="submit" disabled={isSetting}>
                {isSetting && <Loader2 className="animate-spin" />}
                Set password
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
