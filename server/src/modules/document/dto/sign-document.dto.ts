import { IsObject } from 'class-validator';

export class SignDocumentDto {
  // The final JSON-LD credential content the manager signs.
  @IsObject()
  contentJson!: Record<string, unknown>;
}
