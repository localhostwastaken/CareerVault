import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['ORG_ADMIN', 'MANAGER', 'HR', 'RECRUITER'])
  role!: 'ORG_ADMIN' | 'MANAGER' | 'HR' | 'RECRUITER';

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;
}
