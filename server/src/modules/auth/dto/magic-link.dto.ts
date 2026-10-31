import { IsEmail, Matches } from 'class-validator';
import { FORMATS } from '../../../common/validators/formats.js';

export class MagicLinkRequestDto {
  @IsEmail()
  email!: string;
}

export class VerifyMagicLinkDto {
  @Matches(FORMATS.hexToken64, { message: 'The link is not valid' })
  token!: string;
}
