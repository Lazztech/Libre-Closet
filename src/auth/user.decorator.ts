import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Payload } from './dto/payload.dto';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Payload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
