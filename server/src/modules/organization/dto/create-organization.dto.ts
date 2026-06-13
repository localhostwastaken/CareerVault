import { IsString, Matches, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Matches(/^([a-z0-9-]+\.)+[a-z]{2,}$/i, {
    message: 'Enter a valid domain, e.g. acme.com',
  })
  domain!: string;
}
