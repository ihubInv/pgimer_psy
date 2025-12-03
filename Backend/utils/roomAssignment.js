const db = require('../config/database');

/**
 * Get all rooms that are already assigned to doctors today
 * Returns a set of room numbers that are taken
 * Uses CURRENT_DATE from database to ensure consistency with IST timezone
 */
async function getOccupiedRooms() {
  try {
    // Use CURRENT_DATE from database to ensure consistency with IST timezone
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
    
    const result = await db.query(
      `SELECT DISTINCT current_room 
       FROM users 
       WHERE current_room IS NOT NULL 
         AND current_room != ''
         AND DATE(room_assignment_time) = $1`,
      [today]
    );

    return new Set(result.rows.map(row => row.current_room).filter(Boolean));
  } catch (error) {
    console.error('[getOccupiedRooms] Error:', error);
    return new Set();
  }
}

/**
 * Get all available rooms from rooms table (active rooms)
 * Excludes rooms that are already assigned to doctors today
 * Uses the rooms table as the source of truth
 */
async function getAvailableRooms(excludeOccupied = true) {
  try {
    // Get active rooms from rooms table
    const roomsResult = await db.query(
      `SELECT room_number 
       FROM rooms 
       WHERE is_active = true
       ORDER BY room_number`
    );

    let rooms = roomsResult.rows.map(row => row.room_number).filter(Boolean);

    // If no active rooms in table, fallback to discovering from patients
    if (rooms.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const result = await db.query(
        `SELECT DISTINCT assigned_room 
         FROM registered_patient 
         WHERE assigned_room IS NOT NULL 
           AND assigned_room != ''
         ORDER BY assigned_room`
      );
      
      rooms = result.rows.map(row => row.assigned_room).filter(Boolean);
      
      // If still no rooms, return default room numbers (1-10)
      if (rooms.length === 0) {
        rooms = Array.from({ length: 10 }, (_, i) => `Room ${i + 1}`);
      }
    }

    // Exclude rooms that are already assigned to doctors today
    if (excludeOccupied) {
      const occupiedRooms = await getOccupiedRooms();
      rooms = rooms.filter(room => !occupiedRooms.has(room));
    }

    return rooms;
  } catch (error) {
    console.error('[getAvailableRooms] Error:', error);
    // Fallback to default rooms
    return Array.from({ length: 10 }, (_, i) => `Room ${i + 1}`);
  }
}

/**
 * Get room distribution count for ALL patients (not just today)
 * Returns a map of room -> patient count
 * This matches the deletion validation logic which checks all historical patients
 */
async function getRoomDistribution() {
  try {
    // Count ALL patients assigned to each room (not just today's)
    // This ensures consistency with deletion validation
    const result = await db.query(
      `SELECT assigned_room, COUNT(*) as patient_count
       FROM registered_patient
       WHERE assigned_room IS NOT NULL 
         AND assigned_room != ''
       GROUP BY assigned_room
       ORDER BY assigned_room`
    );

    const distribution = {};
    result.rows.forEach(row => {
      distribution[row.assigned_room] = parseInt(row.patient_count, 10);
    });

    console.log(`[getRoomDistribution] Total patient distribution (all time):`, distribution);
    console.log(`[getRoomDistribution] Total rooms with patients:`, result.rows.length);
    
    return distribution;
  } catch (error) {
    console.error('[getRoomDistribution] Error:', error);
    return {};
  }
}

/**
 * Get room distribution count for TODAY's patients only
 * Returns a map of room -> patient count for today
 * Uses CURRENT_DATE from database to ensure consistency with IST timezone
 */
async function getTodayRoomDistribution() {
  try {
    // Use CURRENT_DATE from database to ensure consistency with IST timezone
    // This matches the approach used in getAllPatients and other controllers
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
    
    const result = await db.query(
      `SELECT assigned_room, COUNT(*) as patient_count
       FROM registered_patient
       WHERE assigned_room IS NOT NULL 
         AND assigned_room != ''
         AND DATE(created_at) = $1
       GROUP BY assigned_room
       ORDER BY assigned_room`,
      [today]
    );

    const distribution = {};
    result.rows.forEach(row => {
      distribution[row.assigned_room] = parseInt(row.patient_count, 10);
    });

    console.log(`[getTodayRoomDistribution] Distribution for ${today} (IST):`, distribution);
    
    return distribution;
  } catch (error) {
    console.error('[getTodayRoomDistribution] Error:', error);
    return {};
  }
}

/**
 * Auto-assign room using round-robin distribution
 * Ensures equal distribution across all active rooms from rooms table
 * Excludes rooms that are already assigned to doctors today
 */
async function autoAssignRoom() {
  try {
    // Get active rooms from rooms table (excluding those occupied by doctors today)
    const availableRooms = await getAvailableRooms(true);
    
    if (availableRooms.length === 0) {
      // Check if there are any active rooms at all (even if occupied)
      const allActiveRooms = await getAvailableRooms(false);
      if (allActiveRooms.length === 0) {
        // No active rooms exist, check rooms table for any room
        const roomsResult = await db.query(
          `SELECT room_number FROM rooms WHERE is_active = true ORDER BY room_number LIMIT 1`
        );
        if (roomsResult.rows.length > 0) {
          return roomsResult.rows[0].room_number;
        }
        // No rooms in table, assign to Room 1 as default
        return 'Room 1';
      }
      // All rooms are occupied, still assign to first active room (doctor can reassign later)
      return allActiveRooms[0] || 'Room 1';
    }

    const distribution = await getRoomDistribution();
    
    // Find room with minimum patient count (round-robin distribution)
    let minCount = Infinity;
    let selectedRoom = availableRooms[0]; // Default to first room

    for (const room of availableRooms) {
      const count = distribution[room] || 0;
      if (count < minCount) {
        minCount = count;
        selectedRoom = room;
      }
    }

    return selectedRoom;
  } catch (error) {
    console.error('[autoAssignRoom] Error:', error);
    // Fallback to Room 1
    return 'Room 1';
  }
}

/**
 * Assign all patients in a room to a doctor
 * This is called when a doctor selects their room
 */
async function assignPatientsToDoctor(doctorId, roomNumber, assignmentTime) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Get doctor info
    const doctorResult = await db.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [doctorId]
    );

    if (doctorResult.rows.length === 0) {
      throw new Error('Doctor not found');
    }

    const doctor = doctorResult.rows[0];

    // Find all patients assigned to this room
    // Include both today's patients and patients from previous days (if they're still in the room)
    // Assign ALL patients in the room to this doctor (even if they have a different doctor assigned)
    // This ensures when a doctor selects a room, they get all patients in that room
    const patientsResult = await db.query(
      `SELECT id, name, assigned_doctor_id, DATE(created_at) as created_date
       FROM registered_patient 
       WHERE assigned_room = $1`,
      [roomNumber]
    );

    const patients = patientsResult.rows;
    
    console.log(`[assignPatientsToDoctor] Found ${patients.length} patient(s) in room ${roomNumber} to assign to doctor ${doctorId}`);
    if (patients.length > 0) {
      console.log(`[assignPatientsToDoctor] Patient IDs:`, patients.map(p => `${p.id} (${p.name})`));
    }
    
    if (patients.length === 0) {
      console.log(`[assignPatientsToDoctor] No patients to assign in room ${roomNumber}`);
      return {
        assigned: 0,
        patients: []
      };
    }

    // Update patients to assign them to the doctor
    const patientIds = patients.map(p => p.id);
    
    // Update patients one by one to avoid array parameter issues
    if (patientIds.length > 0) {
      for (const patientId of patientIds) {
        await db.query(
          `UPDATE registered_patient 
           SET assigned_doctor_id = $1, 
               assigned_doctor_name = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
             AND assigned_room = $4`,
          [doctorId, doctor.name, patientId, roomNumber]
        );
      }
    }

    // Create visit records for these patients if they don't have one for today
    for (const patient of patients) {
      // Check if visit exists
      const visitCheck = await db.query(
        `SELECT id FROM patient_visits 
         WHERE patient_id = $1 AND visit_date = $2`,
        [patient.id, today]
      );

      if (visitCheck.rows.length === 0) {
        // Check if this is first visit or follow-up
        const visitCountResult = await db.query(
          `SELECT COUNT(*) as count FROM patient_visits WHERE patient_id = $1`,
          [patient.id]
        );
        const visitCount = parseInt(visitCountResult.rows[0]?.count || 0, 10);
        const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';
        
        // Create visit record
        await db.query(
          `INSERT INTO patient_visits 
           (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
           VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)`,
          [
            patient.id,
            today,
            visitType,
            doctorId,
            roomNumber,
            `Auto-assigned to ${doctor.name} at ${assignmentTime}`
          ]
        );
      } else {
        // Update existing visit record
        await db.query(
          `UPDATE patient_visits 
           SET assigned_doctor_id = $1, room_no = $2, updated_at = CURRENT_TIMESTAMP
           WHERE patient_id = $3 AND visit_date = $4`,
          [doctorId, roomNumber, patient.id, today]
        );
      }
    }

    console.log(`[assignPatientsToDoctor] ✅ Successfully assigned ${patients.length} patient(s) to doctor ${doctorId} in room ${roomNumber}`);
    
    return {
      assigned: patients.length,
      patients: patients.map(p => ({
        id: p.id,
        name: p.name
      }))
    };
  } catch (error) {
    console.error('[assignPatientsToDoctor] ❌ Error:', error);
    console.error('[assignPatientsToDoctor] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Check if a room is already assigned to a doctor today
 * @param {string} roomNumber - The room number to check
 * @param {number} excludeUserId - Optional user ID to exclude from check (allows same doctor to re-select their room)
 */
async function isRoomOccupied(roomNumber, excludeUserId = null) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    let query = `SELECT id, name, current_room 
                 FROM users 
                 WHERE current_room = $1 
                   AND DATE(room_assignment_time) = $2`;
    let params = [roomNumber, today];
    
    // Exclude current user if provided (allows same doctor to re-select their room)
    if (excludeUserId) {
      query += ` AND id != $3`;
      params.push(excludeUserId);
    }
    
    query += ` LIMIT 1`;
    
    const result = await db.query(query, params);

    if (result.rows.length > 0) {
      return {
        occupied: true,
        doctor: {
          id: result.rows[0].id,
          name: result.rows[0].name
        }
      };
    }

    return { occupied: false };
  } catch (error) {
    console.error('[isRoomOccupied] Error:', error);
    return { occupied: false };
  }
}

/**
 * Check if a doctor has selected a room for today
 * @param {number} doctorId - The doctor's user ID
 * @returns {Promise<{hasRoom: boolean, room: string|null}>}
 */
async function hasRoomToday(doctorId) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    const result = await db.query(
      `SELECT current_room, room_assignment_time 
       FROM users 
       WHERE id = $1 
         AND current_room IS NOT NULL 
         AND current_room != ''
         AND DATE(room_assignment_time) = $2`,
      [doctorId, today]
    );

    if (result.rows.length > 0 && result.rows[0].current_room) {
      return {
        hasRoom: true,
        room: result.rows[0].current_room
      };
    }

    return {
      hasRoom: false,
      room: null
    };
  } catch (error) {
    console.error('[hasRoomToday] Error:', error);
    return {
      hasRoom: false,
      room: null
    };
  }
}

module.exports = {
  getAvailableRooms,
  getOccupiedRooms,
  getRoomDistribution,
  getTodayRoomDistribution,
  autoAssignRoom,
  assignPatientsToDoctor,
  isRoomOccupied,
  hasRoomToday
};

