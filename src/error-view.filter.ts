import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ViewContextService } from './view-context/view-context.service';

@Catch()
export class ErrorViewFilter implements ExceptionFilter {
  private logger = new Logger(ErrorViewFilter.name);

  constructor(private readonly viewContextService: ViewContextService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    this.logger.warn(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (response.sent) {
      this.logger.warn('Response already sent, skipping error filter');
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    try {
      const context =
        (response as any).locals ||
        (await this.viewContextService.buildContext(request));
      await response.status(status).view('error', {
        layout: 'layout',
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...context,
      });
    } catch (renderError) {
      this.logger.error(renderError);
      response.status(status).send({ statusCode: status, message });
    }
  }
}
