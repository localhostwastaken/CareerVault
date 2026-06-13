import { IsNotEmpty, IsString } from 'class-validator';

export class MockCompleteDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
