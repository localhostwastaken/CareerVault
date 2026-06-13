import { IsBoolean } from 'class-validator';

export class DiscoverabilityDto {
  @IsBoolean()
  enabled!: boolean;
}
