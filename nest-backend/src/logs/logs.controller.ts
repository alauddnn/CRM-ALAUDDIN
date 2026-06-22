import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN) // Only Admin role can view full audit activity trail
  async getActivityLogs() {
    return this.prisma.activityLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
