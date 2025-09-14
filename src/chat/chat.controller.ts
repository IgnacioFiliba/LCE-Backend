// src/chat/chat.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RateLimitGuard } from 'src/common/rate-limit/rate-limit.guard';

@Controller('chat')
@UseGuards(AuthGuard, RateLimitGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }),
)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post()
  @HttpCode(200)
  async post(@Body() dto: ChatMessageDto, @Req() req: any) {
    try {
      const ctx = {
        userId: dto.userId ?? req.user?.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        isAdmin: req.user?.roles?.includes('admin') || req.user?.isAdmin,
      };
      const reply = await this.chat.respond(dto.message ?? '', ctx);
      return { reply };
    } catch (e: any) {
      console.error('ChatController error:', e?.message || e);
      return { reply: 'Ocurrió un error interno procesando tu consulta.' };
    }
  }
}
