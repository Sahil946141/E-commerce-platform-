import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.js';
import User from '../models/User.js';

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      let token;
      
      // Check cookies first
      if (req.cookies.token) {
        token = req.cookies.token;
      }
      // Then check authorization header
      else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
      }

      // Verify token
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Check if session exists
      const session = await User.findSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Not authorized, session expired' });
      }

      // Get user from the token
      const user = await User.findById(decoded.user_id);
      if (!user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  },

  authorizeRoles: (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to access this route' });
      }
      next();
    };
  },
};

export default authMiddleware;