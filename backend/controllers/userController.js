import User from '../models/User.js';

const userController = {
  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { email, full_name, phone, address, date_of_birth, avatar_url } = req.body;
      
      const currentUser = await User.findById(req.user.user_id);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      let newEmail = currentUser.email; // default keep same

      // If user is actually changing email
      if (email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.user_id !== currentUser.user_id && existingUser.is_active) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        newEmail = email;
      }

      const updateData = {
        email: newEmail,
        full_name: full_name ?? currentUser.full_name,
        phone: phone ?? currentUser.phone,
        address: address ?? currentUser.address,
        date_of_birth: date_of_birth ?? currentUser.date_of_birth,
        avatar_url: avatar_url ?? currentUser.avatar_url
      };

      const updatedUser = await User.update(req.user.user_id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already in use' });
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },
  
  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const users = await User.getAll(limit, offset);
      const totalUsers = await User.getCount();
      const totalPages = Math.ceil(totalUsers / limit);

      res.json({
        users,
        pagination: {
          current: page,
          total: totalPages,
          count: users.length,
          totalUsers
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Get user by ID (admin only)
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  // Deactivate user (admin only or self)
  deactivateUser: async (req, res) => {
    try {
      // Allow users to deactivate their own account or admins to deactivate any account
      const userId = req.params.id;
      if (req.user.role !== 'admin' && req.user.user_id !== parseInt(userId)) {
        return res.status(403).json({ error: 'Not authorized to perform this action' });
      }

      const deactivatedUser = await User.deactivate(userId);
      if (!deactivatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If user is deactivating their own account, logout as well
      if (req.user.user_id === parseInt(userId)) {
        // Invalidate session
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (token) {
          await User.invalidateSession(token);
        }
        res.clearCookie('token');
      }

      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }
};

export default userController;