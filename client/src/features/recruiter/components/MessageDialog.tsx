import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSendMessageMutation } from '@/features/message/api'
import { notify, toastApiError } from '@/lib/notify'

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holderId: string
  holderName: string
  jobOpeningId: string
}

export function MessageDialog({ open, onOpenChange, holderId, holderName, jobOpeningId }: MessageDialogProps) {
  const [sendMessage, { isLoading }] = useSendMessageMutation()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!subject.trim() || !body.trim()) return
    try {
      await sendMessage({ holderId, jobOpeningId, subject: subject.trim(), body: body.trim() }).unwrap()
      notify.success(`Message sent to ${holderName}.`)
      setSubject('')
      setBody('')
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not send the message')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {holderName}</DialogTitle>
          <DialogDescription>They&rsquo;ll be notified and can signal interest.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Opportunity at our team" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="resize-none" placeholder="Why you're reaching out…" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !subject.trim() || !body.trim()}>
              {isLoading && <Loader2 className="animate-spin" />}
              Send message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
