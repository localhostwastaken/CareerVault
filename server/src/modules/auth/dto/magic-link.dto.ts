import { IsEmail, IsString, MinLength } from 'class-validator';

export class MagicLinkRequestDto {
  @IsEmail()
  email!: string;
}

export class VerifyMagicLinkDto {
  @IsString()
  @MinLength(16)
  token!: string;
}
