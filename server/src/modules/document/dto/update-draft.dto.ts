import { IsObject } from 'class-validator';

export class UpdateDraftDto {
  @IsObject()
  contentJson!: Record<string, unknown>;
}
