import { Controller, Post, Body, Res, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

const RegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string(),
});

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = RegisterSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);

    const token = await this.authService.register(result.data);
    this.setCookie(res, token);
    return { success: true };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = LoginSchema.safeParse(body);
    if (!result.success) throw new BadRequestException('Invalid input');

    const token = await this.authService.login(result.data);
    this.setCookie(res, token);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies['sessionId'];
    await this.authService.logout(sessionId);
    res.clearCookie('sessionId', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private setCookie(res: Response, token: string) {
    res.cookie('sessionId', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
