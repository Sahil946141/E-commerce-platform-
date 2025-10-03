import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.js';

const authController = {
  register: async (req, res) => {
  try {
    const { email, password, full_name, phone, address, date_of_birth, avatar_url, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create new user
    const user = await User.create({ 
      email, password, full_name, phone, address, date_of_birth, avatar_url, role 
    });

    // Generate JWT token
    const token = User.generateAuthToken(user);

    // Calculate expiration date
    const decoded = jwt.verify(token, jwtConfig.secret);
    const expiresAt = new Date(decoded.exp * 1000);

    // Create session
    await User.createSession(user.user_id, token, expiresAt);

    res.status(201).json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        date_of_birth: user.date_of_birth,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
},

  login: async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await User.comparePasswords(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = User.generateAuthToken(user);

    // Calculate expiration date
    const decoded = jwt.verify(token, jwtConfig.secret);
    const expiresAt = new Date(decoded.exp * 1000);

    // Create session
    await User.createSession(user.user_id, token, expiresAt);

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        date_of_birth: user.date_of_birth,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
},

  logout: async (req, res) => {
    try {
      const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

      if (token) {
        await User.invalidateSession(token);
      }

      res.clearCookie('token');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
};

export default authController;