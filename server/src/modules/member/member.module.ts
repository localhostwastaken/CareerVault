import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MemberController } from './member.controller.js';
import { MemberService } from './member.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
