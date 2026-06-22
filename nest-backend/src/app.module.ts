import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { LeadsController } from './leads/leads.controller';
import { SpksController } from './spks/spks.controller';
import { LogsController } from './logs/logs.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  controllers: [
    AuthController,
    LeadsController,
    SpksController,
    LogsController,
    HealthController,
  ],
  providers: [
    PrismaService,
  ],
})
export class AppModule {}
