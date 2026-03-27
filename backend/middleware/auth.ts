import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { UnauthorizedError } from 'apollo-server-express';

export const withAuth: MiddlewareFn<any> = async ({ context }, next) => {
  const authHeader = context.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded: any = verify(token, process.env.JWT_SECRET!);

    context.userId = decoded.userId;
    context.roles = decoded.roles;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }

  return next();
};