import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type SystemStatus,
  SystemStatusService,
} from './system-status.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemStatus: SystemStatusService,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{ status: string; timestamp: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('status')
  @ApiOkResponse({
    description:
      'Public, non-secret trust configuration: the chain, AnchorRegistry contract and anchor wallet address Merkle roots go to (with explorer links), the field-encryption scheme, strict mode and encrypted columns, and whether the AI service is configured. Never includes the RPC URL, private keys or the master key.',
  })
  status(): SystemStatus {
    return this.systemStatus.status();
  }
}
