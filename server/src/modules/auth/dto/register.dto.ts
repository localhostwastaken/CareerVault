import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsIn(['HOLDER', 'ORG_ADMIN'])
  accountType!: 'HOLDER' | 'ORG_ADMIN';
}
