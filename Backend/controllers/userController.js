const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const LoginOTP = require('../models/LoginOTP');
const RefreshToken = require('../models/RefreshToken');
const { sendEmail } = require('../config/email');
const { generateAccessToken, getDeviceInfo, getIpAddress } = require('../utils/tokenUtils');
const db = require('../config/database');

class UserController {
  // Register a new user
  static async register(req, res) {
    try {
      const { name, role, email, password } = req.body;

      const user = await User.create({
        name,
        role,
        email,
        password
      });

      // Generate token
      const token = user.generateToken();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      console.error('User registration error:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Login user - Conditional 2FA based on user settings
  // SECURITY FIX #6: Account lockout after failed attempts
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // SECURITY FIX #6: Check if account is locked
      if (user.account_locked_until) {
        const lockUntil = new Date(user.account_locked_until);
        const now = new Date();
        if (lockUntil > now) {
          const minutesRemaining = Math.ceil((lockUntil - now) / 1000 / 60);
          return res.status(423).json({
            success: false,
            message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`
          });
        } else {
          // Lock period expired, reset failed attempts
          await db.query(
            'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1',
            [user.id]
          );
        }
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        // SECURITY FIX #6: Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const maxAttempts = 5;
        const lockoutMinutes = 30;

        if (failedAttempts >= maxAttempts) {
          // Lock account for 30 minutes
          const lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          await db.query(
            'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
            [failedAttempts, lockUntil, user.id]
          );
          return res.status(423).json({
            success: false,
            message: `Account has been temporarily locked due to ${maxAttempts} failed login attempts. Please try again in ${lockoutMinutes} minutes.`
          });
        } else {
          // Update failed attempts count
          await db.query(
            'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
            [failedAttempts, user.id]
          );
          const remainingAttempts = maxAttempts - failedAttempts;
          return res.status(401).json({
            success: false,
            message: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`
          });
        }
      }

      // SECURITY FIX #6: Reset failed attempts on successful password verification
      await db.query(
        'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1',
        [user.id]
      );

      // Check if 2FA is enabled for this user
      if (user.two_factor_enabled) {
        // 2FA is enabled - send OTP
        const loginOTP = await LoginOTP.create(user.id);

        // Send OTP email
        await sendEmail(user.email, 'loginOTP', { userName: user.name, otp: loginOTP.otp });

        res.json({
          success: true,
          message: 'OTP sent to your email. Please check your inbox.',
          data: {
            user_id: user.id,
            email: user.email,
            expires_in: 300 // 5 minutes in seconds
          }
        });
      } else {
        // 2FA is disabled - direct login
        await UserController.completeLogin(user, req, res);
      }
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Verify login OTP - Step 2: Complete login with OTP
  static async verifyLoginOTP(req, res) {
    try {
      const { user_id, otp } = req.body;

      // Validate input
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP is required'
        });
      }

      // Sanitize OTP input (trim whitespace)
      const sanitizedOTP = String(otp).trim().replace(/\s+/g, '');

      // Log the verification attempt (for debugging)
      console.log(`OTP verification attempt for user ${user_id}, OTP: "${otp}" (sanitized: "${sanitizedOTP}")`);

      // Verify OTP
      const loginOTP = await LoginOTP.verifyOTP(user_id, sanitizedOTP);
      if (!loginOTP) {
        // The detailed error is already logged in verifyOTP method
        // Check server logs for specific error details
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP. Please check the code and try again, or request a new OTP.'
        });
      }

      // Get user data
      const userData = loginOTP.getUserData();
      
      // Check if user is still active
      if (!userData.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Mark OTP as used
      await loginOTP.markAsUsed();

      // Create user instance for token generation
      const user = new User(userData);
      
      // Complete login with new token system
      await UserController.completeLogin(user, req, res);
    } catch (error) {
      console.error('Verify login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Resend login OTP
  static async resendLoginOTP(req, res) {
    try {
      const { user_id } = req.body;

      // Validate input
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Get user to verify they exist and are active
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Create a new OTP (this will mark old ones as used)
      const loginOTP = await LoginOTP.create(user.id);

      // Send OTP email
      await sendEmail(user.email, 'loginOTP', { userName: user.name, otp: loginOTP.otp });

      res.json({
        success: true,
        message: 'New OTP sent to your email. Please check your inbox.',
        data: {
          user_id: user.id,
          email: user.email,
          expires_in: 300 // 5 minutes in seconds
        }
      });
    } catch (error) {
      console.error('Resend login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { name, email } = req.body;
      const updateData = {};

      if (name) updateData.name = name;
      if (email) updateData.email = email;

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.message.includes('duplicate key')) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // SECURITY FIX #12: Validate password strength
      const { validatePasswordStrength } = require('../utils/passwordPolicy');
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.changePassword(currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all users (Admin only)
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const role = req.query.role || null;

      const result = await User.findAll(page, limit, role);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get user by ID (Admin only)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update user by ID (Admin only)
  static async updateUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { name, role, email } = req.body;
      const updateData = {};

      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (email) updateData.email = email;

      await user.update(updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Update user by ID error:', error);
      
      if (error.message.includes('duplicate key')) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Activate user by ID (Admin only)
  static async activateUserById(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deactivating themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot activate your own account (already active)'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.activate();

      res.json({
        success: true,
        message: 'User activated successfully',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Activate user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Deactivate user by ID (Admin only)
  static async deactivateUserById(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deactivating themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.deactivate();

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Deactivate user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete user by ID (Admin only)
  static async deleteUserById(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      console.log(`[Delete User] Attempting to delete user ID: ${userId} by admin ID: ${req.user.id}`);
      
      // Validate ID
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }
      
      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log(`[Delete User] User ${userId} not found`);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log(`[Delete User] User found: ${user.name} (${user.email}), proceeding with deletion...`);
      await user.delete();

      console.log(`[Delete User] ✅ User ${userId} deleted successfully`);
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('[Delete User] ❌ Error deleting user:', error);
      console.error('[Delete User] Error stack:', error.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete user';
      if (error.code === '23503') { // Foreign key constraint violation
        errorMessage = 'Cannot delete user: User has associated records that prevent deletion';
      } else if (error.code === '23505') { // Unique constraint violation
        errorMessage = 'Cannot delete user: Constraint violation';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint
        } : undefined
      });
    }
  }

  // Get user statistics (Admin only)
  static async getUserStats(req, res) {
    try {
      const stats = await User.getStats();

      res.json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Select room for doctor (Faculty/Admin/Resident)
  static async selectRoom(req, res) {
    try {
      const { room_number, assignment_time } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Only allow Faculty, Admin, or Resident to select rooms
      const allowedRoles = ['Faculty', 'Admin', 'Resident'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Only Faculty, Admin, or Resident doctors can select rooms'
        });
      }

      if (!room_number || room_number.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Room number is required'
        });
      }

      const assignmentTime = assignment_time || new Date().toISOString();
      const roomNumber = room_number.trim();

      // Check if room is already occupied by another doctor (exclude current user to allow re-selection)
      const { isRoomOccupied } = require('../utils/roomAssignment');
      const roomStatus = await isRoomOccupied(roomNumber, userId);
      
      if (roomStatus.occupied) {
        return res.status(409).json({
          success: false,
          message: `Room ${roomNumber} is already assigned to Dr. ${roomStatus.doctor.name}. Only one doctor can be assigned to a room.`
        });
      }

      // Get user and assign room
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Ensure user has an ID
      if (!user.id) {
        console.error('User object missing ID:', user);
        return res.status(500).json({
          success: false,
          message: 'Invalid user data'
        });
      }

      // If user already has a different room assigned, clear it first
      if (user.current_room && user.current_room !== roomNumber) {
        await user.clearRoom();
      }

      // Assign room to doctor (or re-assign if same room - this allows re-assignment of patients)
      await user.assignRoom(roomNumber, assignmentTime);

      // Auto-assign all patients in this room to this doctor
      // This will assign ALL patients in the room, even if they were previously assigned to another doctor
      // This ensures when a doctor selects a room, they get all patients in that room
      const { assignPatientsToDoctor } = require('../utils/roomAssignment');
      console.log(`[selectRoom] Calling assignPatientsToDoctor for doctor ${userId} in room ${roomNumber}`);
      const assignmentResult = await assignPatientsToDoctor(
        userId,
        roomNumber,
        assignmentTime
      );
      console.log(`[selectRoom] Assignment result: ${assignmentResult.assigned} patient(s) assigned`);

      res.json({
        success: true,
        message: `Room ${roomNumber} selected successfully. ${assignmentResult.assigned} patient(s) assigned to you.`,
        data: {
          room: roomNumber,
          assignment_time: assignmentTime,
          patients_assigned: assignmentResult.assigned,
          patients: assignmentResult.patients
        }
      });
    } catch (error) {
      console.error('Select room error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column
      });
      res.status(500).json({
        success: false,
        message: 'Failed to select room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column
        } : undefined
      });
    }
  }

  // Get available rooms
  static async getAvailableRooms(req, res) {
    try {
      const { getAvailableRooms, getRoomDistribution, getTodayRoomDistribution, getOccupiedRooms } = require('../utils/roomAssignment');
      const allRooms = await getAvailableRooms(false); // Get ALL rooms (including occupied)
      const availableRooms = await getAvailableRooms(true); // Get only available (unoccupied) rooms
      const distribution = await getRoomDistribution(); // All patients (for consistency with deletion)
      const todayDistribution = await getTodayRoomDistribution(); // Today's patients only
      const occupiedRooms = await getOccupiedRooms();
      
      // Debug logging
      console.log('[getAvailableRooms] All rooms:', allRooms);
      console.log('[getAvailableRooms] Available rooms:', availableRooms);
      console.log('[getAvailableRooms] Distribution (all patients):', distribution);
      console.log('[getAvailableRooms] Today distribution:', todayDistribution);
      console.log('[getAvailableRooms] Occupied rooms:', Array.from(occupiedRooms));
      
      // Get doctor info for occupied rooms
      const today = new Date().toISOString().slice(0, 10);
      const occupiedRoomsArray = Array.from(occupiedRooms);
      let occupiedRoomsInfo = {};
      
      if (occupiedRoomsArray.length > 0) {
        // Query each room individually to avoid array parameter issues
        for (const room of occupiedRoomsArray) {
          const occupiedResult = await db.query(
            `SELECT current_room, id, name 
             FROM users 
             WHERE current_room = $1
               AND DATE(room_assignment_time) = $2
             LIMIT 1`,
            [room, today]
          );
          
          if (occupiedResult.rows.length > 0) {
            const row = occupiedResult.rows[0];
            occupiedRoomsInfo[row.current_room] = {
              doctor_id: row.id,
              doctor_name: row.name
            };
          }
        }
      }

      res.json({
        success: true,
        data: {
          rooms: allRooms, // ALL rooms (including occupied ones)
          available_rooms: availableRooms, // Only available (unoccupied) rooms (for backward compatibility)
          distribution, // All patients (for consistency with deletion validation)
          distribution_today: todayDistribution, // Today's patients only (for reference)
          occupied_rooms: occupiedRoomsInfo // Info about which rooms are taken and by whom
        }
      });
    } catch (error) {
      console.error('Get available rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available rooms',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get current user's room assignment (only if assigned today)
  static async getMyRoom(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // CRITICAL: Only return room if it was assigned TODAY
      // Room assignments are day-specific and must be reselected each day
      // Use database CURRENT_DATE to ensure consistency with IST timezone
      const db = require('../config/database');
      const todayResult = await db.query('SELECT CURRENT_DATE as today');
      const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
      
      // Check if room was assigned today using database DATE function
      let isAssignedToday = false;
      if (user.current_room) {
        if (user.room_assignment_time) {
          // Use database DATE function for accurate comparison
          const dateCheckResult = await db.query(
            'SELECT DATE($1::timestamp) = $2::date as is_today',
            [user.room_assignment_time, today]
          );
          isAssignedToday = dateCheckResult.rows[0]?.is_today === true;
        } else {
          // If room exists but no assignment time, check if it was set today
          // This handles edge cases where assignment_time might be null
          // For safety, if room exists but no time, we'll assume it's from today
          // (This should not happen in normal flow, but handles data inconsistencies)
          console.log(`[getMyRoom] WARNING: Room ${user.current_room} exists but no assignment_time. Assuming today.`);
          isAssignedToday = true;
        }
      }

      console.log(`[getMyRoom] User ${req.user.id} (${req.user.name}): current_room="${user.current_room}", assignment_time="${user.room_assignment_time}", today="${today}", isAssignedToday=${isAssignedToday}`);

      // Only return room if assigned today
      if (user.current_room && isAssignedToday) {
        res.json({
          success: true,
          data: {
            current_room: user.current_room,
            room_assignment_time: user.room_assignment_time
          }
        });
      } else {
        // No room assigned today
        res.json({
          success: true,
          data: {
            current_room: null,
            room_assignment_time: null
          }
        });
      }
    } catch (error) {
      console.error('Get my room error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get room assignment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Clear room assignment
  static async clearRoom(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.clearRoom();

      res.json({
        success: true,
        message: 'Room assignment cleared successfully'
      });
    } catch (error) {
      console.error('Clear room error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear room assignment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get doctors (JR/SR) - Accessible to all authenticated users
  static async getDoctors(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;

      // Get users with role Faculty or Resident
      const result = await User.findAll(page, limit, null);

      // Filter for Faculty and Resident roles
      const doctors = result.users.filter(user => {
        const role = user.role || '';
        return role === 'Faculty' || 
               role === 'Resident' ||
               // Legacy support for old role names
               role === 'Faculty Residents (Junior Resident (JR))' || 
               role === 'Faculty Residents (Senior Resident (SR))' ||
               role === 'JR' || 
               role === 'SR';
      });

      res.json({
        success: true,
        data: {
          users: doctors,
          pagination: {
            page,
            limit,
            total: doctors.length,
            pages: Math.ceil(doctors.length / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get doctors error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get doctors',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Forgot password - Send OTP to email
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists or not
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset OTP has been sent.'
        });
      }

      // Create password reset token with OTP
      const resetToken = await PasswordResetToken.create(user.id);

      // Send OTP email
      try {
        await sendEmail(user.email, 'passwordResetOTP', { userName: user.name, otp: resetToken.otp });
        
        // SECURITY FIX: Store token in HttpOnly cookie instead of exposing in response
        // This prevents token theft via XSS or network interception
        res.cookie('passwordResetToken', resetToken.token, {
          httpOnly: true,
          secure: false, // Set to true when using HTTPS
          sameSite: 'lax', // Changed from 'strict' to allow cross-origin requests
          maxAge: 15 * 60 * 1000, // 15 minutes (matches token expiration)
          path: '/' // Ensure cookie is available for all paths
        });
        
        res.json({
          success: true,
          message: 'If an account with this email exists, a password reset OTP has been sent.'
          // Token is stored in HttpOnly cookie, not exposed in response
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        res.status(500).json({
          success: false,
          message: 'Failed to send reset email. Please try again later.'
        });
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Verify OTP for password reset
  static async verifyOTP(req, res) {
    try {
      // SECURITY FIX: Get token from HttpOnly cookie (preferred) or request body (fallback for debugging)
      let token = req.cookies?.passwordResetToken;
      const { token: bodyToken, otp } = req.body;

      // Fallback: If cookie is not available, use token from body (for debugging)
      // This helps identify if the issue is cookie-related
      if (!token && bodyToken) {
        console.warn('[verifyOTP] Token not found in cookie, using token from request body (fallback mode)');
        token = bodyToken;
      }

      // Debug logging
      console.log('[verifyOTP] Cookies received:', Object.keys(req.cookies || {}));
      console.log('[verifyOTP] Token from cookie:', token ? 'present' : 'missing');
      console.log('[verifyOTP] OTP received:', otp);

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Reset session expired. Please request a new password reset.'
        });
      }

      if (!otp || otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 6-digit OTP'
        });
      }

      // Verify OTP
      const resetToken = await PasswordResetToken.verifyOTP(token, otp);
      if (!resetToken) {
        // Clear invalid token cookie
        res.clearCookie('passwordResetToken');
        console.log('[verifyOTP] OTP verification failed. Token:', token.substring(0, 10) + '...', 'OTP:', otp);
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP. Please check your OTP and try again.'
        });
      }

      // If token was from body (fallback), set it in cookie for next step
      if (!req.cookies?.passwordResetToken && bodyToken) {
        res.cookie('passwordResetToken', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
          path: '/'
        });
      }

      // Token is already in cookie, no need to send it in response
      // Cookie will be used for password reset
      res.json({
        success: true,
        message: 'OTP verified successfully'
        // Token remains in HttpOnly cookie, not exposed in response
        // User info removed for security
      });

    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Reset password with verified token
  static async resetPassword(req, res) {
    try {
      // SECURITY FIX: Get token from HttpOnly cookie instead of request body
      const token = req.cookies?.passwordResetToken;
      const { newPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Reset session expired. Please complete OTP verification first.'
        });
      }

      // SECURITY FIX #2: Ensure token is NOT a JWT access token
      // Reset tokens are stored in database, not JWT tokens
      // This prevents using a user's access token to reset their password
      const jwt = require('jsonwebtoken');
      try {
        // If token can be decoded as JWT, reject it (reset tokens are not JWTs)
        jwt.verify(token, process.env.JWT_SECRET);
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token format. Please use the token from password reset email.'
        });
      } catch (jwtError) {
        // Token is not a JWT, which is expected for reset tokens - continue
      }

      // SECURITY FIX #1: Find valid token that has been verified via OTP
      // This prevents bypassing OTP verification by manipulating client responses
      const resetToken = await PasswordResetToken.findByToken(token);
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token. Please complete OTP verification first.'
        });
      }

      // Additional security check: Ensure OTP was verified
      if (!resetToken.otp_verified) {
        return res.status(400).json({
          success: false,
          message: 'OTP verification required before password reset'
        });
      }

      // Get user and update password
      const user = await User.findById(resetToken.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // SECURITY FIX #12: Validate password strength before reset
      const { validatePasswordStrength } = require('../utils/passwordPolicy');
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      // Update password
      await user.updatePassword(newPassword);

      // Mark token as used
      await resetToken.markAsUsed();

      // SECURITY FIX: Clear the reset token cookie after successful password reset
      res.clearCookie('passwordResetToken');

      // Send success email
      try {
        await sendEmail(user.email, 'passwordResetSuccess', { userName: user.name });
      } catch (emailError) {
        console.error('Success email sending failed:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Enable 2FA for user
  static async enable2FA(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if 2FA is already enabled
      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled for this account'
        });
      }

      // Enable 2FA
      await user.enable2FA();

      res.json({
        success: true,
        message: '2FA has been enabled successfully',
        data: {
          two_factor_enabled: true
        }
      });
    } catch (error) {
      console.error('Enable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Disable 2FA for user
  // SECURITY FIX #14: Require OTP verification before disabling 2FA
  static async disable2FA(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if 2FA is already disabled
      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already disabled for this account'
        });
      }

      // SECURITY: Require OTP verification to disable 2FA
      const { otp } = req.body;
      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP verification is required to disable 2FA. Please provide the OTP from your authenticator app or email.'
        });
      }

      // Verify OTP using login OTP system
      const loginOTP = await LoginOTP.verifyOTP(user.id, otp);
      if (!loginOTP) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP. Please provide a valid OTP to disable 2FA.'
        });
      }

      // Mark OTP as used
      await loginOTP.markAsUsed();

      // Disable 2FA
      await user.disable2FA();

      res.json({
        success: true,
        message: '2FA has been disabled successfully',
        data: {
          two_factor_enabled: false
        }
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Admin: Enable 2FA for any user
  static async adminEnable2FA(req, res) {
    try {
      const userId = parseInt(req.params.id, 10);
      const targetUser = await User.findById(userId);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if 2FA is already enabled
      if (targetUser.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled for this user'
        });
      }

      // Enable 2FA
      await targetUser.enable2FA();

      res.json({
        success: true,
        message: '2FA has been enabled successfully for the user',
        data: {
          user_id: userId,
          two_factor_enabled: true
        }
      });
    } catch (error) {
      console.error('Admin enable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Admin: Disable 2FA for any user
  static async adminDisable2FA(req, res) {
    try {
      const userId = parseInt(req.params.id, 10);
      const targetUser = await User.findById(userId);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if 2FA is already disabled
      if (!targetUser.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already disabled for this user'
        });
      }

      // Disable 2FA
      await targetUser.disable2FA();

      res.json({
        success: true,
        message: '2FA has been disabled successfully for the user',
        data: {
          user_id: userId,
          two_factor_enabled: false
        }
      });
    } catch (error) {
      console.error('Admin disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Helper method to complete login with access and refresh tokens
  static async completeLogin(user, req, res) {
    try {
      // Generate access token (10 minutes - consistent with session timeout)
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create refresh token in database
      const deviceInfo = getDeviceInfo(req);
      const ipAddress = getIpAddress(req);
      const refreshTokenRecord = await RefreshToken.create(user.id, deviceInfo, ipAddress);

      // SECURITY FIX #20: Set Secure flag based on HTTPS (DISABLED - using HTTP)
      // Set refresh token in HttpOnly cookie
      // const isHTTPS = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
      const isHTTPS = false; // Using HTTP, not HTTPS
      res.cookie('refreshToken', refreshTokenRecord.token, {
        httpOnly: true,
        secure: false, // Set to false for HTTP
        sameSite: 'lax', // Changed from 'strict' to allow cross-origin requests
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Update last login
      await user.updateLastLogin();

      // Determine redirect URL based on user role
      let redirectUrl = '/';
      if (user.role === 'Admin') {
        redirectUrl = '/';
      } else if (['Faculty', 'Resident'].includes(user.role)) {
        redirectUrl = '/clinical-today-patients';
      } else if (user.role === 'Psychiatric Welfare Officer') {
        redirectUrl = '/patients';
      }

      // SECURITY FIX #3: Role is included in response for frontend navigation
      // Role is also in JWT token for authorization, but we include it here for UI purposes
      // All authorization is still validated server-side from database
      const userResponse = user.toJSON();
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: userResponse.id,
            name: userResponse.name,
            email: userResponse.email,
            role: userResponse.role, // Include role for frontend navigation
            two_factor_enabled: userResponse.two_factor_enabled,
            created_at: userResponse.created_at
          },
          accessToken,
          expiresIn: 600, // 10 minutes in seconds (consistent with session timeout)
          redirectUrl: redirectUrl // Add redirect URL for frontend
        }
      });
    } catch (error) {
      console.error('Complete login error:', error);
      throw error;
    }
  }
}

module.exports = UserController;
