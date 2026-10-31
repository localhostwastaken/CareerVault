import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';
import { FORMATS } from '../../../common/validators/formats.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @Matches(FORMATS.phone, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isDiscoverable?: boolean;
}
