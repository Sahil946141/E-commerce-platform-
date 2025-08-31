import { config } from 'dotenv';

config();

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

export default jwtConfig;