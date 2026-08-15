import { IsEmail, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
