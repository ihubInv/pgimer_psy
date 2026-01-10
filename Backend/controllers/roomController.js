const Room = require('../models/Room');
const db = require('../config/database');

class RoomController {
  // Get all rooms with pagination and filters
  static async getAllRooms(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search || undefined
      };

      const result = await Room.findAll(page, limit, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get all rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get rooms',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get room by ID
  static async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const roomId = parseInt(id, 10);

      if (isNaN(roomId) || roomId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      res.json({
        success: true,
        data: room.toJSON()
      });
    } catch (error) {
      console.error('Get room by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create new room
  static async createRoom(req, res) {
    try {
      const { room_number, description, is_active } = req.body;

      if (!room_number || room_number.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Room number is required'
        });
      }

      // Check if room number already exists
      const existingRoom = await Room.findByRoomNumber(room_number.trim());
      if (existingRoom) {
        return res.status(409).json({
          success: false,
          message: 'Room number already exists'
        });
      }

      const roomData = {
        room_number: room_number.trim(),
        description: description?.trim() || null,
        is_active: is_active !== undefined ? is_active : true
      };

      const room = await Room.create(roomData);

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room.toJSON()
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update room
  static async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const roomId = parseInt(id, 10);

      if (isNaN(roomId) || roomId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const { room_number, description, is_active } = req.body;

      // If room_number is being updated, check if new number already exists
      if (room_number && room_number.trim() !== room.room_number) {
        const existingRoom = await Room.findByRoomNumber(room_number.trim());
        if (existingRoom && existingRoom.id !== roomId) {
          return res.status(409).json({
            success: false,
            message: 'Room number already exists'
          });
        }
      }

      const updateData = {};
      if (room_number !== undefined) updateData.room_number = room_number.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (is_active !== undefined) updateData.is_active = is_active;

      await room.update(updateData);

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: room.toJSON()
      });
    } catch (error) {
      console.error('Update room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete room (permanent delete)
  static async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const roomId = parseInt(id, 10);

      if (isNaN(roomId) || roomId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const db = require('../config/database');
      const today = new Date().toISOString().slice(0, 10);
      
      // Check if force delete is requested
      const forceDelete = req.query.force === 'true';

      // Check if any patients are assigned to this room TODAY (not historical - created today)
      const todayPatientsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM registered_patient 
         WHERE assigned_room = $1 
           AND DATE(created_at) = $2`,
        [room.room_number, today]
      );

      const todayPatientsCount = parseInt(todayPatientsResult.rows[0].count, 10);

      if (todayPatientsCount > 0 && !forceDelete) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete room "${room.room_number}". There are ${todayPatientsCount} patient(s) assigned to this room today. Use "Force Delete" to clear all assignments and delete.`,
          canForceDelete: true,
          todayPatientsCount: todayPatientsCount,
          hasTodayPatients: true
        });
      }

      // Check if room is currently assigned to a doctor today
      const doctorAssignmentResult = await db.query(
        `SELECT id, name, current_room 
         FROM users 
         WHERE current_room = $1 
           AND DATE(room_assignment_time) = $2`,
        [room.room_number, today]
      );

      const doctorAssignmentCount = doctorAssignmentResult.rows.length;
      const assignedDoctors = doctorAssignmentResult.rows;

      if (doctorAssignmentCount > 0 && !forceDelete) {
        const doctorNames = assignedDoctors.map(d => d.name).join(', ');
        return res.status(400).json({
          success: false,
          message: `Cannot delete room "${room.room_number}". Doctor(s) currently assigned: ${doctorNames}. Use "Force Delete" to clear all assignments and delete.`,
          canForceDelete: true,
          assignedDoctorsCount: doctorAssignmentCount,
          assignedDoctors: doctorNames,
          hasDoctorAssignment: true
        });
      }

      // Check if any patients are assigned to this room (any time - historical)
      const allPatientsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM registered_patient 
         WHERE assigned_room = $1`,
        [room.room_number]
      );

      const allPatientsCount = parseInt(allPatientsResult.rows[0].count, 10);

      if (allPatientsCount > 0 && !forceDelete) {
        // Historical patients exist - ask for force delete confirmation
        return res.status(400).json({
          success: false,
          message: `Cannot delete room "${room.room_number}". There are ${allPatientsCount} patient(s) historically assigned to this room. Use "Force Delete" to clear historical references and delete the room.`,
          canForceDelete: true,
          historicalPatientsCount: allPatientsCount
        });
      }

      // Force delete - clear all assignments
      if (forceDelete) {
        console.log(`[deleteRoom] Force deleting room "${room.room_number}"`);
        
        // Clear doctor assignments first
        if (doctorAssignmentCount > 0) {
          console.log(`[deleteRoom] Clearing room assignment for ${doctorAssignmentCount} doctor(s)`);
          await db.query(
            `UPDATE users 
             SET current_room = NULL, room_assignment_time = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE current_room = $1`,
            [room.room_number]
          );
        }
        
        // Clear today's patient room assignments
        if (todayPatientsCount > 0) {
          console.log(`[deleteRoom] Clearing room for ${todayPatientsCount} today's patient(s)`);
          await db.query(
            `UPDATE registered_patient 
             SET assigned_room = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE assigned_room = $1 AND DATE(created_at) = $2`,
            [room.room_number, today]
          );
        }
        
        // Clear historical patient room assignments
        if (allPatientsCount > 0) {
          console.log(`[deleteRoom] Clearing assigned_room for ${allPatientsCount} historical patient(s)`);
          const clearResult = await db.query(
            `UPDATE registered_patient 
             SET assigned_room = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE assigned_room = $1`,
            [room.room_number]
          );
          console.log(`[deleteRoom] Cleared assigned_room for ${clearResult.rowCount} patient(s)`);
        }
        
        // Clear room_no from patient_visits for this room
        const clearVisitsResult = await db.query(
          `UPDATE patient_visits 
           SET room_no = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE room_no = $1`,
          [room.room_number]
        );
        console.log(`[deleteRoom] Cleared room_no from ${clearVisitsResult.rowCount} visit record(s)`);
      }

      // All checks passed - proceed with permanent deletion
      await room.hardDelete();

      res.json({
        success: true,
        message: forceDelete && allPatientsCount > 0 
          ? `Room deleted successfully. Cleared room reference from ${allPatientsCount} historical patient(s).`
          : 'Room deleted successfully',
        data: room.toJSON()
      });
    } catch (error) {
      console.error('Delete room error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = RoomController;

