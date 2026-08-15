import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, ChatRole } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import type { AssistantAction } from './assistant-action';

@Injectable()
export class AssistantRepository {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessions: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
  ) {}

  createSession(userId: string | null, title: string): Promise<ChatSession> {
    return this.sessions.save(this.sessions.create({ userId, title }));
  }

  findSessionById(id: string): Promise<ChatSession | null> {
    return this.sessions.findOne({ where: { id } });
  }

  findSessionsForUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[ChatSession[], number]> {
    return this.sessions.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip,
      take,
    });
  }

  /** Bumps updated_at so the history list orders by last activity. */
  async touchSession(id: string): Promise<void> {
    await this.sessions.update(id, { updatedAt: new Date() });
  }

  async removeSession(session: ChatSession): Promise<void> {
    // Messages cascade on the FK, so the session row is all we delete here.
    await this.sessions.remove(session);
  }

  addMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
    actions: AssistantAction[] = [],
  ): Promise<ChatMessage> {
    return this.messages.save(
      this.messages.create({ sessionId, role, content, actions }),
    );
  }

  findMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }
}
