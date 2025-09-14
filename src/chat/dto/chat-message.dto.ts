// src/chat/dto/chat-message.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
