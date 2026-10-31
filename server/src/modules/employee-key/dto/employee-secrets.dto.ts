import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  REQUIRED_ANSWERS,
  SECURITY_QUESTION_IDS,
} from '../security-questions.js';

export class SecurityAnswerDto {
  @IsIn(SECURITY_QUESTION_IDS)
  questionId!: string;

  @IsString()
  @Length(2, 100)
  answer!: string;
}

// What the employee types at enrolment and again at every signature (step-up). Never stored.
export class EmployeeSecretsDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth!: string;

  @Matches(/^[A-Za-z0-9][A-Za-z0-9 -]{2,30}[A-Za-z0-9]$/, {
    message:
      'personalId must be 4–32 letters, digits, spaces or hyphens (e.g. an employee code)',
  })
  personalId!: string;

  @IsArray()
  @ArrayMinSize(REQUIRED_ANSWERS)
  @ArrayMaxSize(REQUIRED_ANSWERS)
  @ArrayUnique((answer: SecurityAnswerDto) => answer.questionId, {
    message: 'Choose three different questions',
  })
  @ValidateNested({ each: true })
  @Type(() => SecurityAnswerDto)
  answers!: SecurityAnswerDto[];
}

export class EnrollEmployeeKeyDto extends EmployeeSecretsDto {
  @IsUUID()
  organizationId!: string;

  // Replacing an existing key requires its current details: otherwise a stolen session could
  // re-enrol with answers of its own choosing and sign as this employee.
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeSecretsDto)
  currentStepUp?: EmployeeSecretsDto;
}

// An org admin's way out for an employee who forgot their answers.
export class ResetEmployeeKeyDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;
}
