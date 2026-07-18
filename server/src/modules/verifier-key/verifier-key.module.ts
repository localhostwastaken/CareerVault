import { Module } from '@nestjs/common';
import { VerifierKeyController } from './verifier-key.controller.js';
import { VerifierKeyService } from './verifier-key.service.js';

@Module({
  controllers: [VerifierKeyController],
  providers: [VerifierKeyService],
})
export class VerifierKeyModule {}
