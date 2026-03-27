import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your_jwt_secret_key';
const REFRESH_TOKEN_SECRET = 'your_refresh_token_secret_key';

interface User {
  id: string;
  username: string;
}

interface TokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function register(req: Request, res: Response): void {
  const { username, password } = req.body;

  // Create a new user in the database
  // For demonstration, we'll just simulate a user creation
  const newUser: User = {
    id: '1',
    username,
  };

  // Generate access and refresh tokens
  const accessToken = jwt.sign({ userId: newUser.id, username }, JWT_SECRET, { expiresIn: '30m' });
  const refreshToken = jwt.sign({ userId: newUser.id, username }, REFRESH_TOKEN_SECRET);

  res.json({
    message: 'User registered successfully',
    user: newUser,
    tokens: {
      accessToken,
      refreshToken,
    },
  });
}

export function login(req: Request, res: Response): void {
  const { username, password } = req.body;

  // Authenticate the user
  // For demonstration, we'll just simulate a successful authentication
  if (username === 'admin' && password === 'password') {
    const user: User = {
      id: '1',
      username,
    };

    // Generate access and refresh tokens
    const accessToken = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '30m' });
    const refreshToken = jwt.sign({ userId: user.id, username }, REFRESH_TOKEN_SECRET);

    res.json({
      message: 'Login successful',
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
}

export function verifyToken(req: Request, res: Response): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      res.json({
        message: 'Token is valid',
        user: { id: decoded.userId, username: decoded.username },
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    res.status(401).json({ message: 'No token provided' });
  }
}

export function refreshToken(req: Request, res: Response): void {
  const refreshToken = req.headers.authorization?.split(' ')[1];

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;
      const newAccessToken = jwt.sign({ userId: decoded.userId, username: decoded.username }, JWT_SECRET, { expiresIn: '30m' });
      res.json({
        message: 'Refresh token successful',
        accessToken: newAccessToken,
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  } else {
    res.status(401).json({ message: 'No refresh token provided' });
  }
}