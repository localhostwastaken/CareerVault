import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { FORMATS } from '../../../common/validators/formats.js';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @Matches(FORMATS.hexToken64, { message: 'The link is not valid' })
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
