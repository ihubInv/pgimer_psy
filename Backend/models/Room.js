const db = require('../config/database');

class Room {
  constructor(data) {
    this.id = data.id;
    this.room_number = data.room_number;
    this.description = data.description;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new room
  static async create(roomData) {
    try {
      const { room_number, description, is_active } = roomData;
      
      // Check if room already exists
      const existingRoom = await db.query(
        'SELECT id FROM rooms WHERE room_number = $1',
        [room_number]
      );

      if (existingRoom.rows.length > 0) {
        throw new Error('Room number already exists');
      }

      const result = await db.query(
        `INSERT INTO rooms (room_number, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [room_number, description || null, is_active !== undefined ? is_active : true]
      );

      return new Room(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find room by ID
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM rooms WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Room(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find room by room number
  static async findByRoomNumber(roomNumber) {
    try {
      const result = await db.query(
        'SELECT * FROM rooms WHERE room_number = $1',
        [roomNumber]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Room(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Get all rooms with pagination and filters
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM rooms WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) FROM rooms WHERE 1=1';
      const params = [];
      let paramCount = 0;

      // Filter by is_active
      if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        countQuery += ` AND is_active = $${paramCount}`;
        params.push(filters.is_active);
      }

      // Filter by search term (room_number)
      if (filters.search) {
        paramCount++;
        query += ` AND room_number ILIKE $${paramCount}`;
        countQuery += ` AND room_number ILIKE $${paramCount}`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY room_number ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const [roomsResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);

      const rooms = roomsResult.rows.map(row => new Room(row));
      const total = parseInt(countResult.rows[0].count);

      return {
        rooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Update room
  async update(updateData) {
    try {
      const allowedFields = ['room_number', 'description', 'is_active'];
      const updates = [];
      const values = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return this;
      }

      paramCount++;
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const query = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await db.query(query, values);

      if (result.rows.length > 0) {
        Object.assign(this, new Room(result.rows[0]));
      }

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete room (soft delete by setting is_active = false)
  async delete() {
    try {
      // Check if room is being used by any patients today
      const today = new Date().toISOString().slice(0, 10);
      const patientCheck = await db.query(
        `SELECT COUNT(*) as count FROM registered_patient 
         WHERE assigned_room = $1 AND DATE(created_at) = $2`,
        [this.room_number, today]
      );

      if (parseInt(patientCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete room. It is currently assigned to patients.');
      }

      // Check if room is assigned to any doctor today
      const doctorCheck = await db.query(
        `SELECT COUNT(*) as count FROM users 
         WHERE current_room = $1 AND DATE(room_assignment_time) = CURRENT_DATE`,
        [this.room_number]
      );

      if (parseInt(doctorCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete room. It is currently assigned to a doctor.');
      }

      // Soft delete by setting is_active = false
      const result = await db.query(
        'UPDATE rooms SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length > 0) {
        this.is_active = false;
      }

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete room (permanent deletion)
  // Note: All validation (patients, doctors, etc.) is done in the controller
  // This method just performs the actual database deletion
  async hardDelete() {
    try {
      const db = require('../config/database');
      await db.query('DELETE FROM rooms WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      room_number: this.room_number,
      description: this.description,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Room;

