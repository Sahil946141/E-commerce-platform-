import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.js';

class User {
  // AUTHENTICATION METHODS
  static async create({ email, password, full_name, phone, address, date_of_birth, avatar_url, role = 'customer' }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await client.query(
      `INSERT INTO users (email, password, full_name, phone, address, date_of_birth, avatar_url, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING user_id, email, full_name, phone, address, date_of_birth, avatar_url, role, is_active, created_at`,
      [email, hashedPassword, full_name, phone, address, date_of_birth, avatar_url, role]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', err.stack);
    throw err;
  } finally {
    client.release();
  }
}
  
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT user_id, email, password, full_name, phone, address, date_of_birth, avatar_url, role, is_active, created_at FROM users WHERE email = $1 AND is_active = TRUE', 
      [email]
    );
    return result.rows[0];
  }
  
  static async findById(user_id) {
    const result = await db.query(
      'SELECT user_id, email, full_name, phone, address, date_of_birth, avatar_url, role, is_active, created_at FROM users WHERE user_id = $1 AND is_active = TRUE',
      [user_id]
    );
    return result.rows[0];
  }

  static async comparePasswords(candidatePassword, hashedPassword) {
  if (!candidatePassword || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, hashedPassword);
}

  static async createSession(user_id, token, expiresAt) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user_id, token, expiresAt]
      );
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async invalidateSession(token) {
    await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
  }

  static async findSession(token) {
    const result = await db.query(
      'SELECT * FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return result.rows[0];
  }

  static generateAuthToken(user) {
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    return token;
  }

  // USER MANAGEMENT METHODS
  static async update(user_id, { email, full_name, phone, address, date_of_birth, avatar_url }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      console.log('Updating user:', user_id, { email, full_name, phone, address, date_of_birth, avatar_url });
      
      const result = await client.query(
        `UPDATE users 
         SET email = $1, full_name = $2, phone = $3, address = $4, date_of_birth = $5, avatar_url = $6, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $7 AND is_active = TRUE 
         RETURNING user_id, email, full_name, phone, address, date_of_birth, avatar_url, role, is_active, created_at, updated_at`,
        [email, full_name, phone, address, date_of_birth, avatar_url, user_id]
      );
      
      await client.query('COMMIT');
      
      console.log('Update successful:', result.rows[0]);
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Update error:', err.message, err.stack);
      throw err;
    } finally {
      client.release();
    }
  }
  
  static async deactivate(user_id) {
    const result = await db.query(
      'UPDATE users SET is_active = FALSE WHERE user_id = $1 RETURNING user_id',
      [user_id]
    );
    return result.rows[0];
  }

  static async getAll(limit = 10, offset = 0) {
    const result = await db.query(
      'SELECT user_id, email, full_name, phone, address, date_of_birth, avatar_url, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  static async getCount() {
    const result = await db.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE');
    return parseInt(result.rows[0].count);
  }
}

export default User;