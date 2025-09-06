import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user;
    const loginData = await this.authService.googleLogin(user);
    const encodedData = encodeURIComponent(JSON.stringify(loginData));

    const frontendUrl = process.env.FRONTEND_URL;

    return res.redirect(`${frontendUrl}/home?data=${encodedData}`);
  }
}
