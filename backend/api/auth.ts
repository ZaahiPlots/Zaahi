import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const secretKey = 'your-secret-key';

interface User {
  id: number;
  username: string;
  password: string;
}

let users: User[] = [];

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ id: users.length + 1, username, password: hashedPassword });
  res.status(201).json({ message: 'User registered successfully' });
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Verify token
router.get('/verifyToken', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    res.status(200).json({ message: 'Token is valid', user: decoded });
  });
});

// Refresh token
router.post('/refreshToken', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  jwt.verify(token, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    const user = users.find(u => u.id === decoded.id);
    if (user) {
      const newToken = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
      res.status(200).json({ message: 'Token refreshed successfully', token: newToken });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
});

export default router;