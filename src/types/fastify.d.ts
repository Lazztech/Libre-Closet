import { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    viewPartial(page: string, data?: Record<string, unknown>): FastifyReply;
    viewPartialAsync(page: string, data?: Record<string, unknown>): Promise<string>;
  }
}
