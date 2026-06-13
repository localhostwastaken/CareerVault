// Transactional email abstraction. ConsoleEmail (dev) today, SES later.
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}
