import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateJobOpeningDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requiredSkills!: string[];

  @IsOptional()
  @IsIn(['JUNIOR', 'MID', 'SENIOR', 'LEAD'])
  seniority?: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(50)
  yearsExpMin?: number;
}
