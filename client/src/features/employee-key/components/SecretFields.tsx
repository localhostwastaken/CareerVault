import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { SecurityQuestion } from '@/features/employee-key/types'

interface SecretFieldsProps {
  /** Path of these fields inside the surrounding form, e.g. "current.". */
  prefix?: string
  /** The bank to choose from when enrolling, or the signer's own questions at step-up. */
  questions: SecurityQuestion[]
  /** Enrolment: pick each question. Step-up: the questions are fixed and only answered. */
  isChoosing?: boolean
}

// The signer's date of birth, personal ID and three answers. At step-up the values are
// masked, since signing often happens on a shared or projected screen.
export function SecretFields({ prefix = '', questions, isChoosing = false }: SecretFieldsProps) {
  const { control } = useFormContext()
  const secretType = isChoosing ? 'text' : 'password'

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${prefix}dateOfBirth`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth</FormLabel>
              <FormControl>
                <Input type="date" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${prefix}personalId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal ID</FormLabel>
              <FormControl>
                <Input type={secretType} autoComplete="off" placeholder="e.g. employee code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          {isChoosing ? (
            <FormField
              control={control}
              name={`${prefix}answers.${index}.questionId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question {index + 1}</FormLabel>
                  <FormControl>
                    <SelectNative {...field}>
                      <option value="">Choose a question</option>
                      {questions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.text}
                        </option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={control}
            name={`${prefix}answers.${index}.answer`}
            render={({ field }) => (
              <FormItem>
                {isChoosing ? (
                  <FormLabel className="sr-only">Answer {index + 1}</FormLabel>
                ) : (
                  <FormLabel>{questions[index]?.text ?? `Answer ${index + 1}`}</FormLabel>
                )}
                <FormControl>
                  <Input type={secretType} autoComplete="off" spellCheck={false} placeholder="Your answer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  )
}
