import { Middleware } from '@koa/router';
import jwt, { JwtPayload } from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET_KEY || 'default_secret_key';

export const withAuth: Middleware = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
      ctx.status = 401;
      ctx.body = { message: 'No token provided' };
      return;
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, secretKey) as JwtPayload;

    ctx.state.user = {
      userId: decodedToken.userId,
      roles: decodedToken.roles
    };

    await next();
  } catch (error) {
    ctx.status = 403;
    ctx.body = { message: 'Invalid token' };
  }
};