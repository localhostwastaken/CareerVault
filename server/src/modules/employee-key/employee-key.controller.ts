import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { EnrollEmployeeKeyDto } from './dto/employee-secrets.dto.js';
import { EmployeeKeyService } from './employee-key.service.js';
import { SECURITY_QUESTIONS } from './security-questions.js';

// The signer's own key. Nothing here returns key material, salts or iteration counts: the
// client learns only whether it is enrolled and which questions it chose.
@ApiTags('employee-keys')
@Controller('employee-keys')
export class EmployeeKeyController {
  constructor(private readonly employeeKeys: EmployeeKeyService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.employeeKeys.listForUser(user);
  }

  @Get('questions')
  questions() {
    return SECURITY_QUESTIONS;
  }

  // Each enrolment runs 600k PBKDF2 iterations; the throttle keeps that from being a lever.
  @Post('enroll')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enroll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EnrollEmployeeKeyDto,
  ) {
    return this.employeeKeys.enroll(user, dto);
  }
}
