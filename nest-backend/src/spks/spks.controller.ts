import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, SpkStatus, LeadStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber } from 'class-validator';

class CreateSpkDto {
  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  value: number;
}

class ReviewSpkDto {
  @IsEnum(SpkStatus)
  status: SpkStatus;

  @IsString()
  @IsOptional()
  financeNotes?: string;
}

@Controller('spks')
@UseGuards(AuthGuard)
export class SpksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSpks(@Req() req: any) {
    const user = req.user;

    // Sales can only view SPKs they created, Finance & Admin can view all
    if (user.role === Role.SALES) {
      return this.prisma.spk.findMany({
        where: { createdById: user.id },
        include: { lead: true, createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.spk.findMany({
      include: { 
        lead: true, 
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  async createSpk(@Req() req: any, @Body() dto: CreateSpkDto) {
    const user = req.user;

    // Check if the lead exists and is owned by the sales representative
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new BadRequestException('The specified lead does not exist');
    }
    if (user.role === Role.SALES && lead.salesId !== user.id) {
      throw new ForbiddenException('You cannot generate SPK for a lead that is not assigned to you');
    }

    // Only allow conversion if lead status is WON
    if (lead.status !== LeadStatus.WON) {
      throw new BadRequestException('Only leads with status WON can be converted to SPK');
    }

    // Ensure there is no existing SPK for this lead
    const existingSpk = await this.prisma.spk.findFirst({ where: { leadId: dto.leadId } });
    if (existingSpk) {
      throw new BadRequestException('This lead already has an SPK assigned');
    }

    // Generate unique SPK number e.g., SPK-20260622-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const spkNumber = `SPK-${dateStr}-${randomSuffix}`;

    const spk = await this.prisma.spk.create({
      data: {
        spkNumber,
        leadId: dto.leadId,
        title: dto.title,
        description: dto.description,
        value: dto.value,
        status: SpkStatus.PENDING,
        createdById: user.id,
      },
    });

    // Keep lead status as WON (already required) or optionally mark as under SPK
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_SPK',
        details: `Generated SPK ${spkNumber} for company ${lead.companyName} with value ${dto.value}`,
        previousStatus: lead.status,
        newStatus: lead.status,
        note: `SPK ${spkNumber} created`,
      },
    });
    return spk;
  }

  @Put(':id/review')
  @Roles(Role.FINANCE, Role.ADMIN)
  async reviewSpk(@Param('id') id: string, @Req() req: any, @Body() dto: ReviewSpkDto) {
    const user = req.user;

    const existingSpk = await this.prisma.spk.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existingSpk) {
      throw new BadRequestException('SPK not found');
    }

    // Require financeNotes when rejecting
    if (dto.status === SpkStatus.REJECTED && (!dto.financeNotes || dto.financeNotes.trim().length === 0)) {
      throw new BadRequestException('Finance notes are required when rejecting an SPK');
    }

    const updated = await this.prisma.spk.update({
      where: { id },
      data: {
        status: dto.status,
        financeNotes: dto.financeNotes || null,
        approvedById: user.id,
      },
    });

    // If approved, verify and update associated lead status to WON

    const prevLead = await this.prisma.lead.findUnique({ where: { id: existingSpk.leadId } });

    if (dto.status === SpkStatus.APPROVED) {
      await this.prisma.lead.update({ where: { id: existingSpk.leadId }, data: { status: LeadStatus.WON } });
    } else if (dto.status === SpkStatus.REJECTED) {
      await this.prisma.lead.update({ where: { id: existingSpk.leadId }, data: { status: LeadStatus.LOST } });
    }

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: dto.status === SpkStatus.APPROVED ? 'APPROVE_SPK' : 'REJECT_SPK',
        details: `${dto.status} SPK ${existingSpk.spkNumber}. Finance Notes: ${dto.financeNotes || 'None'}`,
        previousStatus: prevLead?.status || null,
        newStatus: dto.status === SpkStatus.APPROVED ? LeadStatus.WON : LeadStatus.LOST,
        note: dto.financeNotes || null,
      },
    });

    return updated;
  }

  @Put(':id')
  @Roles(Role.SALES, Role.ADMIN)
  async updateSpk(@Param('id') id: string, @Req() req: any, @Body() dto: CreateSpkDto) {
    const user = req.user;
    const existing = await this.prisma.spk.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('SPK not found');

    if (existing.status === SpkStatus.APPROVED) {
      throw new ForbiddenException('Approved SPK cannot be modified');
    }

    // Sales can only modify their own SPK
    if (user.role === Role.SALES && existing.createdById !== user.id) {
      throw new ForbiddenException('You can only modify SPKs you created');
    }

    const updated = await this.prisma.spk.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        value: dto.value,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_SPK',
        details: `Updated SPK ${existing.spkNumber}`,
        previousStatus: null,
        newStatus: null,
        note: null,
      },
    });

    return updated;
  }
}
