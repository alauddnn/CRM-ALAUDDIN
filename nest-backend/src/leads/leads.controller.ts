import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, LeadStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsEmail, IsDecimal, IsEnum, IsOptional } from 'class-validator';

class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsNotEmpty()
  estimatedValue: number;

  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

@Controller('leads')
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getLeads(@Req() req: any) {
    const user = req.user;
    const query = req.query || {};
    const page = Number(query.page || 1);
    const limit = Math.min(Number(query.limit || 10), 100);
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();

    const where: any = {};
    if (user.role === Role.SALES) {
      where.salesId = user.id;
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'All') {
      where.status = status;
    }

    const total = await this.prisma.lead.count({ where });
    const leads = await this.prisma.lead.findMany({
      where,
      include: { sales: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      leads,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  async createLead(@Req() req: any, @Body() dto: CreateLeadDto) {
    const user = req.user;
    const lead = await this.prisma.lead.create({
      data: {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        source: dto.source,
        estimatedValue: dto.estimatedValue,
        status: dto.status,
        notes: dto.notes || '',
        salesId: user.id, // assigned to current active sales rep
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_LEAD',
        details: `Created lead ${dto.companyName} for contact ${dto.contactName}`,
        previousStatus: null,
        newStatus: lead.status,
        note: dto.notes || null,
      },
    });

    return lead;
  }

  @Put(':id')
  @Roles(Role.SALES, Role.ADMIN)
  async updateLead(@Param('id') id: string, @Req() req: any, @Body() dto: CreateLeadDto) {
    const user = req.user;
    const existing = await this.prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      throw new ForbiddenException('Lead not found');
    }

    if (user.role === Role.SALES && existing.salesId !== user.id) {
      throw new ForbiddenException('You can only modify leads assigned to you');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        source: dto.source,
        estimatedValue: dto.estimatedValue,
        status: dto.status,
        notes: dto.notes || '',
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_LEAD',
        details: `Updated lead ${dto.companyName} details. Status updated.`,
        previousStatus: existing.status,
        newStatus: dto.status,
        note: dto.notes || null,
      },
    });

    return updated;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteLead(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new ForbiddenException('Lead not found');
    }

    await this.prisma.lead.delete({ where: { id } });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_LEAD',
        details: `Deleted lead with ID: ${id}`,
        previousStatus: existing.status,
        newStatus: null,
        note: null,
      },
    });

    return { message: 'Lead deleted successfully' };
  }
}
