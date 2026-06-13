import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  holderId!: string;

  @IsOptional()
  @IsUUID()
  jobOpeningId?: string;

  @IsString()
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MaxLength(4000)
  body!: string;
}
