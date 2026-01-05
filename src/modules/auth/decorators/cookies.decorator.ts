import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CookiesDto } from '../dto/cookies.dto';

export const Cookies = createParamDecorator((data: keyof CookiesDto, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ cookies: CookiesDto }>();
  return data ? request.cookies?.[data] : request.cookies;
});
