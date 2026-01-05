import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common/types/auth.types';

export const CurrentUser = createParamDecorator((data: keyof AuthenticatedUser, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

  return data ? request.user?.[data] : request.user;
});
