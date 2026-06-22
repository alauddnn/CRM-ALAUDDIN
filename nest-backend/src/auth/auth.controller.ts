import { Controller, Post, Body, UnauthorizedException, BadRequestException, HttpCode, HttpStatus, Get, Req } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from '@prisma/client';
import { IsEmail, IsString, IsEnum, MinLength } from 'class-validator';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered in CRM');
    }

    // In production, bcrypt.hash should be utilized; for technical test simulation let's save cleanly
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: dto.password, // plain or hashed
        role: dto.role,
      },
    });

    // Create custom JWT token base64 format for frontend
    const token = this.generateSimulatedToken(user);

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.password !== dto.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate custom JWT token
    const token = this.generateSimulatedToken(user);

    // Save into Activity Log
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `${user.name} logged in successfully`,
        previousStatus: null,
        newStatus: null,
        note: null,
      },
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  @Get('me')
  async me(@Req() req: any) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new UnauthorizedException('Malformed token');
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString('ascii');
      const decoded = JSON.parse(payloadStr);

      const user = await this.prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new UnauthorizedException('User not found');

      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    } catch (err) {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }

  private generateSimulatedToken(user: any): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours expiry
      }),
    ).toString('base64');
    const signature = Buffer.from('mock-crm-key-92813').toString('base64');
    return `${header}.${payload}.${signature}`;
  }
}
