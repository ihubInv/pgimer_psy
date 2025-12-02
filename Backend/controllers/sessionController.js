// // const RefreshToken = require('../models/RefreshToken');
// // const User = require('../models/User');
// // const { generateAccessToken, getDeviceInfo, getIpAddress } = require('../utils/tokenUtils');
// // const db = require('../config/database');

// // class SessionController {
// //   /**
// //    * Refresh access token using refresh token
// //    * Only refreshes if user has been active within the last 15 minutes
// //    */
// //   static async refreshToken(req, res) {
// //     try {
// //       // Get refresh token from HttpOnly cookie
// //       const refreshToken = req.cookies?.refreshToken;

// //       if (!refreshToken) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'Refresh token required'
// //         });
// //       }

// //       // Find refresh token in database
// //       const tokenRecord = await RefreshToken.findByToken(refreshToken);
// //       if (!tokenRecord || !tokenRecord.isValid()) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'Invalid or expired refresh token'
// //         });
// //       }

// //       // Check if user has been active within last 10 seconds
// //       const lastActivity = new Date(tokenRecord.last_activity);
// //       const now = new Date();
// //       const inactiveSeconds = (now - lastActivity) / 1000;

// //       if (inactiveSeconds > 10) {
// //         // Session expired due to inactivity
// //         await tokenRecord.revoke();
        
// //         // Clear refresh token cookie
// //         res.clearCookie('refreshToken', {
// //           httpOnly: true,
// //           secure: false,
// //           sameSite: 'lax'
// //         });

// //         return res.status(401).json({
// //           success: false,
// //           message: 'Session expired due to inactivity',
// //           code: 'SESSION_EXPIRED'
// //         });
// //       }

// //       // Get user data
// //       const user = await User.findById(tokenRecord.user_id);
// //       if (!user || !user.is_active) {
// //         await tokenRecord.revoke();
// //         return res.status(401).json({
// //           success: false,
// //           message: 'User not found or inactive'
// //         });
// //       }

// //       // Update last activity
// //       await tokenRecord.updateActivity();

// //       // Generate new access token
// //       const accessToken = generateAccessToken({
// //         userId: user.id,
// //         email: user.email,
// //         role: user.role
// //       });

// //       res.json({
// //         success: true,
// //         data: {
// //           accessToken,
// //           expiresIn: 10 // 5 minutes in seconds
// //         }
// //       });
// //     } catch (error) {
// //       console.error('Refresh token error:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Failed to refresh token',
// //         error: process.env.NODE_ENV === 'development' ? error.message : undefined
// //       });
// //     }
// //   }

// //   /**
// //    * Logout - Revoke refresh token
// //    */
// //   static async logout(req, res) {
// //     try {
// //       const refreshToken = req.cookies?.refreshToken;

// //       if (refreshToken) {
// //         const tokenRecord = await RefreshToken.findByToken(refreshToken);
// //         if (tokenRecord) {
// //           await tokenRecord.revoke();
// //         }
// //       }

// //       // Clear refresh token cookie
// //       res.clearCookie('refreshToken', {
// //         httpOnly: true,
// //         secure: false,
// //         sameSite: 'lax'
// //       });

// //       res.json({
// //         success: true,
// //         message: 'Logged out successfully'
// //       });
// //     } catch (error) {
// //       console.error('Logout error:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Failed to logout',
// //         error: process.env.NODE_ENV === 'development' ? error.message : undefined
// //       });
// //     }
// //   }

// //   /**
// //    * Update activity timestamp
// //    * Called by frontend to keep session alive
// //    */
// //   static async updateActivity(req, res) {
// //     try {
// //       const refreshToken = req.cookies?.refreshToken;

// //       if (!refreshToken) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'Refresh token required'
// //         });
// //       }

// //       const tokenRecord = await RefreshToken.findByToken(refreshToken);
// //       if (!tokenRecord || !tokenRecord.isValid()) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'Invalid or expired refresh token'
// //         });
// //       }

// //       // Update last activity
// //       await tokenRecord.updateActivity();

// //       res.json({
// //         success: true,
// //         message: 'Activity updated'
// //       });
// //     } catch (error) {
// //       console.error('Update activity error:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Failed to update activity',
// //         error: process.env.NODE_ENV === 'development' ? error.message : undefined
// //       });
// //     }
// //   }

// //   /**
// //    * Get current session info
// //    */
// //   static async getSessionInfo(req, res) {
// //     try {
// //       const refreshToken = req.cookies?.refreshToken;

// //       if (!refreshToken) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'No active session'
// //         });
// //       }

// //       const tokenRecord = await RefreshToken.findByToken(refreshToken);
// //       if (!tokenRecord || !tokenRecord.isValid()) {
// //         return res.status(401).json({
// //           success: false,
// //           message: 'Invalid or expired session'
// //         });
// //       }

// //       // // Calculate time until session expires (15 minutes from last activity)
// //       // const lastActivity = new Date(tokenRecord.last_activity);
// //       // const sessionExpiresAt = new Date(lastActivity.getTime() + 15 * 60 * 1000);
// //       // const now = new Date();
// //       // const secondsUntilExpiry = Math.max(0, Math.floor((sessionExpiresAt - now) / 1000));


// //       // Calculate time until session expires (10 seconds from last activity)
// // const lastActivity = new Date(tokenRecord.last_activity);
// // const sessionExpiresAt = new Date(lastActivity.getTime() + 10 * 1000);
// // const now = new Date();
// // const secondsUntilExpiry = Math.max(0, Math.floor((sessionExpiresAt - now) / 1000))
// //       res.json({
// //         success: true,
// //         data: {
// //           lastActivity: tokenRecord.last_activity,
// //           sessionExpiresAt: sessionExpiresAt.toISOString(),
// //           secondsUntilExpiry,
// //           deviceInfo: tokenRecord.device_info
// //         }
// //       });
// //     } catch (error) {
// //       console.error('Get session info error:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Failed to get session info',
// //         error: process.env.NODE_ENV === 'development' ? error.message : undefined
// //       });
// //     }
// //   }
// // }

// // module.exports = SessionController;



// const RefreshToken = require('../models/RefreshToken');
// const User = require('../models/User');
// const { generateAccessToken } = require('../utils/tokenUtils');

// class SessionController {

//   /**
//    * Refresh access token
//    * Session expires if user inactive for 60 seconds
//    */
//   static async refreshToken(req, res) {
//     try {
//       const refreshToken = req.cookies?.refreshToken;

//       if (!refreshToken) {
//         return res.status(401).json({
//           success: false,
//           message: 'Refresh token required'
//         });
//       }

//       const tokenRecord = await RefreshToken.findByToken(refreshToken);
//       if (!tokenRecord || !tokenRecord.isValid()) {
//         return res.status(401).json({
//           success: false,
//           message: 'Invalid or expired refresh token'
//         });
//       }

//       // Check inactivity (60 seconds)
//       const lastActivity = new Date(tokenRecord.last_activity);
//       const now = new Date();
//       const inactiveSeconds = (now - lastActivity) / 1000;

//       if (inactiveSeconds > 60) {
//         await tokenRecord.revoke();

//         res.clearCookie('refreshToken', {
//           httpOnly: true,
//           secure: false,
//           sameSite: 'lax'
//         });

//         return res.status(401).json({
//           success: false,
//           message: 'Session expired due to inactivity',
//           code: 'SESSION_EXPIRED'
//         });
//       }

//       // Fetch user
//       const user = await User.findById(tokenRecord.user_id);
//       if (!user || !user.is_active) {
//         await tokenRecord.revoke();
//         return res.status(401).json({
//           success: false,
//           message: 'User not found or inactive'
//         });
//       }

//       // Update activity
//       await tokenRecord.updateActivity();

//       // Generate new access token (expires in 60 sec)
//       const accessToken = generateAccessToken({
//         userId: user.id,
//         email: user.email,
//         role: user.role
//       });

//       return res.json({
//         success: true,
//         data: {
//           accessToken,
//           expiresIn: 60 // 1 minute
//         }
//       });

//     } catch (error) {
//       console.error('Refresh token error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to refresh token',
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   }

//   /**
//    * Logout: Revoke refresh token
//    */
//   static async logout(req, res) {
//     try {
//       const refreshToken = req.cookies?.refreshToken;

//       if (refreshToken) {
//         const tokenRecord = await RefreshToken.findByToken(refreshToken);
//         if (tokenRecord) await tokenRecord.revoke();
//       }

//       res.clearCookie('refreshToken', {
//         httpOnly: true,
//         secure: false,
//         sameSite: 'lax'
//       });

//       return res.json({
//         success: true,
//         message: 'Logged out successfully'
//       });

//     } catch (error) {
//       console.error('Logout error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to logout',
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   }

//   /**
//    * Update activity
//    */
//   static async updateActivity(req, res) {
//     try {
//       const refreshToken = req.cookies?.refreshToken;

//       if (!refreshToken) {
//         return res.status(401).json({
//           success: false,
//           message: 'Refresh token required'
//         });
//       }

//       const tokenRecord = await RefreshToken.findByToken(refreshToken);
//       if (!tokenRecord || !tokenRecord.isValid()) {
//         return res.status(401).json({
//           success: false,
//           message: 'Invalid or expired refresh token'
//         });
//       }

//       await tokenRecord.updateActivity();

//       return res.json({
//         success: true,
//         message: 'Activity updated'
//       });

//     } catch (error) {
//       console.error('Update activity error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to update activity',
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   }

//   /**
//    * Get session info
//    * Session expires after 60 seconds of inactivity
//    */
//   static async getSessionInfo(req, res) {
//     try {
//       const refreshToken = req.cookies?.refreshToken;

//       if (!refreshToken) {
//         return res.status(401).json({
//           success: false,
//           message: 'No active session'
//         });
//       }

//       const tokenRecord = await RefreshToken.findByToken(refreshToken);
//       if (!tokenRecord || !tokenRecord.isValid()) {
//         return res.status(401).json({
//           success: false,
//           message: 'Invalid or expired session'
//         });
//       }

//       // Calculate expiry (60 sec)
//       const lastActivity = new Date(tokenRecord.last_activity);
//       const sessionExpiresAt = new Date(lastActivity.getTime() + 60 * 1000);
//       const now = new Date();
//       const secondsUntilExpiry = Math.max(
//         0,
//         Math.floor((sessionExpiresAt - now) / 1000)
//       );

//       return res.json({
//         success: true,
//         data: {
//           lastActivity: tokenRecord.last_activity,
//           sessionExpiresAt: sessionExpiresAt.toISOString(),
//           secondsUntilExpiry,
//           deviceInfo: tokenRecord.device_info
//         }
//       });

//     } catch (error) {
//       console.error('Get session info error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to get session info',
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   }
// }

// module.exports = SessionController;



const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { generateAccessToken } = require('../utils/tokenUtils');

class SessionController {

  /**
   * Refresh access token
   * Session expires if user inactive for 600 seconds (10 minutes)
   */
  static async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (!tokenRecord || !tokenRecord.isValid()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Check inactivity (600 seconds = 10 minutes)
      const lastActivity = new Date(tokenRecord.last_activity);
      const now = new Date();
      const inactiveSeconds = (now - lastActivity) / 1000;

      if (inactiveSeconds > 600) {
        await tokenRecord.revoke();

        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });

        return res.status(401).json({
          success: false,
          message: 'Session expired due to inactivity',
          code: 'SESSION_EXPIRED'
        });
      }

      // Fetch user
      const user = await User.findById(tokenRecord.user_id);
      if (!user || !user.is_active) {
        await tokenRecord.revoke();
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Update activity
      await tokenRecord.updateActivity();

      // Generate new access token (expires in 600 sec = 10 minutes)
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: 600 // 10 minutes
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Logout: Revoke refresh token
   */
  static async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        const tokenRecord = await RefreshToken.findByToken(refreshToken);
        if (tokenRecord) await tokenRecord.revoke();
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });

      return res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update activity
   */
  static async updateActivity(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (!tokenRecord || !tokenRecord.isValid()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      await tokenRecord.updateActivity();

      return res.json({
        success: true,
        message: 'Activity updated'
      });

    } catch (error) {
      console.error('Update activity error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update activity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get session info
   * Session expires after 600 seconds (10 minutes) of inactivity
   */
  static async getSessionInfo(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'No active session'
        });
      }

      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (!tokenRecord || !tokenRecord.isValid()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session'
        });
      }

      // Calculate expiry (600 sec = 10 minutes)
      const lastActivity = new Date(tokenRecord.last_activity);
      const sessionExpiresAt = new Date(lastActivity.getTime() + 600 * 1000);
      const now = new Date();
      const secondsUntilExpiry = Math.max(
        0,
        Math.floor((sessionExpiresAt - now) / 1000)
      );

      return res.json({
        success: true,
        data: {
          lastActivity: tokenRecord.last_activity,
          sessionExpiresAt: sessionExpiresAt.toISOString(),
          secondsUntilExpiry,
          deviceInfo: tokenRecord.device_info
        }
      });

    } catch (error) {
      console.error('Get session info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get session info',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = SessionController;