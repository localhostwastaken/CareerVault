import { Module } from '@nestjs/common';
import { EmployeeKeyController } from './employee-key.controller.js';
import { EmployeeKeyService } from './employee-key.service.js';

@Module({
  controllers: [EmployeeKeyController],
  providers: [EmployeeKeyService],
  exports: [EmployeeKeyService],
})
export class EmployeeKeyModule {}
