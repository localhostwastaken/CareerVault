export type MessageResponse = 'PENDING' | 'INTERESTED' | 'NOT_INTERESTED'

export interface SentMessage {
  id: string
  holderName: string
  subject: string
  body: string
  jobTitle: string | null
  sentAt: string
  readAt: string | null
  responseType: MessageResponse
}

export interface ReceivedMessage {
  id: string
  recruiterName: string
  organizationName: string
  subject: string
  body: string
  jobTitle: string | null
  sentAt: string
  responseType: MessageResponse
}

export interface SendMessageRequest {
  holderId: string
  jobOpeningId?: string
  subject: string
  body: string
}
