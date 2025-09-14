// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatToolsService } from './tools.service';
import { Products } from 'src/products/entities/product.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { Users } from 'src/users/entities/user.entity';

// 👇 importa SIEMPRE el MISMO archivo donde definiste el token
import { RateLimitGuard } from 'src/common/rate-limit/rate-limit.guard';
import { RATE_LIMIT_OPTIONS } from 'src/common/rate-limit/rate-limit.tokens';

@Module({
  imports: [TypeOrmModule.forFeature([Products, Orders, Users])],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatToolsService,

    // 👇 el guard
    RateLimitGuard,

    // 👇 el provider para el token que el guard necesita
    {
      provide: RATE_LIMIT_OPTIONS,
      useValue: {
        windowMs: 60_000, // 1 minuto
        max: 10, // 10 req/min
        // keyGenerator: (req: any) => req.user?.id || req.ip || 'global',
      },
    },
  ],
})
export class ChatModule {}
