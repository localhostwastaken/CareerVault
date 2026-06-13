import { IsIn } from 'class-validator';

export class RespondMessageDto {
  @IsIn(['INTERESTED', 'NOT_INTERESTED'])
  responseType!: 'INTERESTED' | 'NOT_INTERESTED';
}
