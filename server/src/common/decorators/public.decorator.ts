import { SetMetadata } from '@nestjs/common';

// Opt a route out of the global JwtAuthGuard (login, register, public verify, health).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
