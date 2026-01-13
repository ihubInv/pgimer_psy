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
 * Counts patients that are either created today OR have a visit today
 * ONLY counts rooms that exist in the rooms table (active rooms)
 * This matches the frontend filtering logic and assignPatientsToDoctor
 * Uses CURRENT_DATE from database to ensure consistency with IST timezone
 */
async function getTodayRoomDistribution() {
  try {
    // Use CURRENT_DATE from database to ensure consistency with IST timezone
    // This matches the approach used in getAllPatients and other controllers
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
    
    console.log(`[getTodayRoomDistribution] Using today's date: ${today}`);
    
    // First, get all active rooms from rooms table - these are the valid rooms
    const activeRoomsResult = await db.query(
      `SELECT room_number FROM rooms WHERE is_active = true ORDER BY room_number`
    );
    const activeRooms = activeRoomsResult.rows.map(row => row.room_number).filter(Boolean);
    
    if (activeRooms.length === 0) {
      console.log('[getTodayRoomDistribution] No active rooms found in rooms table, returning empty distribution');
      return {};
    }
    
    console.log(`[getTodayRoomDistribution] Active rooms from rooms table: ${activeRooms.join(', ')}`);
    
    // Count ONLY patients created/registered today (not patients with visits today)
    // This matches the patient list filtering logic - only show patients registered today by MWO
    // Use simple DATE() function which respects database timezone settings
    // Cast room values to text for consistent comparison (handles both numeric and text room values)
    // IMPORTANT: Only count rooms that exist in the rooms table (active rooms)
    const result = await db.query(
      `SELECT 
         TRIM(COALESCE(rp.assigned_room::text, '')) as room,
         COUNT(DISTINCT rp.id) as patient_count
       FROM registered_patient rp
       WHERE DATE(rp.created_at) = $1 
         AND rp.assigned_room IS NOT NULL 
         AND TRIM(COALESCE(rp.assigned_room::text, '')) != ''
         -- Only include rooms that exist in the rooms table (active rooms)
         AND (
           TRIM(COALESCE(rp.assigned_room::text, '')) = ANY($2::text[])
           OR EXISTS (
             SELECT 1 FROM rooms r 
             WHERE r.is_active = true 
               AND r.room_number = TRIM(COALESCE(rp.assigned_room::text, ''))
           )
         )
       GROUP BY TRIM(COALESCE(rp.assigned_room::text, ''))
       HAVING TRIM(COALESCE(rp.assigned_room::text, '')) != ''
       ORDER BY room`,
      [today, activeRooms]
    );

    const distribution = {};
    
    // Initialize all active rooms with 0 count (ensures all rooms from rooms table are included)
    for (const room of activeRooms) {
      distribution[room] = 0;
    }
    
    // Update distribution with actual patient counts (only for rooms that exist in rooms table)
    result.rows.forEach(row => {
      // Use 'room' field from COALESCE(pv.room_no, rp.assigned_room)
      const roomName = row.room ? String(row.room).trim() : null;
      if (roomName) {
        // Only include if room exists in active rooms list
        if (activeRooms.includes(roomName)) {
          distribution[roomName] = parseInt(row.patient_count, 10);
        } else {
          console.log(`[getTodayRoomDistribution] Skipping room "${roomName}" - not in active rooms list`);
        }
      }
    });

    console.log(`[getTodayRoomDistribution] Distribution for ${today} (IST):`, distribution);
    console.log(`[getTodayRoomDistribution] Found ${result.rows.length} room(s) with patients`);
    
    // Debug: Log sample queries to verify both new and existing patients are being found
    try {
      const newPatientsResult = await db.query(
        `SELECT rp.id, rp.name, rp.assigned_room, 
                DATE(rp.created_at) as created_date,
                rp.created_at as created_at_raw
         FROM registered_patient rp
         WHERE rp.assigned_room IS NOT NULL 
           AND rp.assigned_room::text IS NOT NULL
           AND TRIM(rp.assigned_room::text) != ''
           AND DATE(rp.created_at) = $1
         ORDER BY rp.id DESC
         LIMIT 10`,
        [today]
      );
      console.log(`[getTodayRoomDistribution] New patients created today:`, newPatientsResult.rows.length);
      if (newPatientsResult.rows.length > 0) {
        console.log(`[getTodayRoomDistribution] Sample new patients:`, newPatientsResult.rows.map(p => ({
          id: p.id,
          name: p.name,
          room: p.assigned_room,
          created_date: p.created_date,
          created_at_raw: p.created_at_raw
        })));
      }
    } catch (debugError) {
      console.error('[getTodayRoomDistribution] Debug query error (non-fatal):', debugError.message);
    }
    
    // Note: We no longer count existing patients with visits today - only patients registered today
    // This matches the patient list filtering logic
    
    return distribution;
  } catch (error) {
    console.error('[getTodayRoomDistribution] Error:', error);
    console.error('[getTodayRoomDistribution] Error stack:', error.stack);
    
    // Fallback: Try simpler query without timezone conversion
    try {
      console.log('[getTodayRoomDistribution] Attempting fallback query without timezone conversion...');
      const todayResult = await db.query('SELECT CURRENT_DATE as today');
      const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
      
      // Get active rooms from rooms table for fallback
      const activeRoomsResult = await db.query(
        `SELECT room_number FROM rooms WHERE is_active = true ORDER BY room_number`
      );
      const activeRoomsFallback = activeRoomsResult.rows.map(row => row.room_number).filter(Boolean);
      
      // Fallback: Only count patients created today (matching main query logic)
      const fallbackResult = await db.query(
        `SELECT 
           TRIM(COALESCE(rp.assigned_room::text, '')) as room,
           COUNT(DISTINCT rp.id) as patient_count
         FROM registered_patient rp
         WHERE DATE(rp.created_at) = $1 
           AND rp.assigned_room IS NOT NULL 
           AND TRIM(COALESCE(rp.assigned_room::text, '')) != ''
           AND TRIM(COALESCE(rp.assigned_room::text, '')) = ANY($2::text[])
         GROUP BY TRIM(COALESCE(rp.assigned_room::text, ''))
         HAVING TRIM(COALESCE(rp.assigned_room::text, '')) != ''
         ORDER BY room`,
        [today, activeRoomsFallback.length > 0 ? activeRoomsFallback : ['']]
      );

      const distribution = {};
      
      // Initialize all active rooms with 0 count
      for (const room of activeRoomsFallback) {
        distribution[room] = 0;
      }
      
      fallbackResult.rows.forEach(row => {
        const roomName = row.room ? String(row.room).trim() : null;
        if (roomName && activeRoomsFallback.includes(roomName)) {
          distribution[roomName] = parseInt(row.patient_count, 10);
        }
      });

      console.log(`[getTodayRoomDistribution] Fallback distribution:`, distribution);
      return distribution;
    } catch (fallbackError) {
      console.error('[getTodayRoomDistribution] Fallback query also failed:', fallbackError);
      return {};
    }
  }
}

/**
 * @deprecated This function is no longer used. Room selection is now mandatory.
 * 
 * Previously: Auto-assign room using round-robin distribution
 * Ensures equal distribution across ALL active rooms from rooms table
 * INCLUDES rooms that are already assigned to doctors today (for equal distribution)
 * Uses TODAY's distribution to ensure equal distribution for today's patients only
 * ONLY assigns to rooms that exist in the rooms table (active rooms)
 * 
 * IMPORTANT: This function distributes patients equally to ALL rooms, even if they're occupied by doctors.
 * This ensures fair distribution regardless of doctor assignments.
 * 
 * NOTE: As of 2026-01-10, room selection is mandatory during patient registration.
 * The Psychiatric Welfare Officer must select a room - auto-assignment is no longer allowed.
 */
async function autoAssignRoom() {
  try {
    // Get ALL active rooms from rooms table (including those occupied by doctors)
    // This ensures equal distribution across all rooms, not just unoccupied ones
    const allActiveRooms = await getAvailableRooms(false);
    
    if (allActiveRooms.length === 0) {
      // No active rooms exist in rooms table - this is an error condition
      console.error('[autoAssignRoom] ERROR: No active rooms found in rooms table! Cannot auto-assign.');
      // Try to get any room from rooms table (even inactive) as last resort
      const roomsResult = await db.query(
        `SELECT room_number FROM rooms ORDER BY room_number LIMIT 1`
      );
      if (roomsResult.rows.length > 0) {
        console.warn(`[autoAssignRoom] WARNING: Using inactive room ${roomsResult.rows[0].room_number} as fallback`);
        return roomsResult.rows[0].room_number;
      }
      // No rooms in table at all - this should not happen, but assign to Room 1 as absolute fallback
      console.error('[autoAssignRoom] CRITICAL: No rooms found in rooms table! Using "Room 1" as absolute fallback.');
      return 'Room 1';
    }

    // Use TODAY's distribution instead of all-time distribution
    // This ensures equal distribution for today's patients only
    // getTodayRoomDistribution now ONLY counts rooms from rooms table
    const todayDistribution = await getTodayRoomDistribution();
    
    console.log(`[autoAssignRoom] All active rooms from rooms table (including occupied): ${allActiveRooms.join(', ')}`);
    console.log(`[autoAssignRoom] Today's distribution:`, todayDistribution);
    
    // Find room with minimum patient count for TODAY (round-robin distribution)
    // Consider ALL active rooms (including those occupied by doctors) for equal distribution
    let minCount = Infinity;
    let selectedRoom = allActiveRooms[0]; // Default to first room from rooms table
    const roomsWithMinCount = []; // Track all rooms with the minimum count

    for (const room of allActiveRooms) {
      // Count patients in all rooms (including occupied ones) for equal distribution
      const count = todayDistribution[room] || 0;
      if (count < minCount) {
        minCount = count;
        selectedRoom = room;
        roomsWithMinCount.length = 0; // Clear previous rooms
        roomsWithMinCount.push(room);
      } else if (count === minCount) {
        // If multiple rooms have the same minimum count, collect them
        roomsWithMinCount.push(room);
      }
    }

    // If multiple rooms have the same minimum count, pick the first one alphabetically
    // This ensures consistent behavior when counts are equal
    if (roomsWithMinCount.length > 1) {
      roomsWithMinCount.sort();
      selectedRoom = roomsWithMinCount[0];
    }

    console.log(`[autoAssignRoom] ✅ Selected room: ${selectedRoom} with ${minCount} patient(s) today (from ${allActiveRooms.length} total active rooms, including occupied ones)`);

    return selectedRoom;
  } catch (error) {
    console.error('[autoAssignRoom] Error:', error);
    // Try to get first active room from rooms table as fallback
    try {
      const roomsResult = await db.query(
        `SELECT room_number FROM rooms WHERE is_active = true ORDER BY room_number LIMIT 1`
      );
      if (roomsResult.rows.length > 0) {
        console.log(`[autoAssignRoom] Using fallback room: ${roomsResult.rows[0].room_number}`);
        return roomsResult.rows[0].room_number;
      }
    } catch (fallbackError) {
      console.error('[autoAssignRoom] Fallback query also failed:', fallbackError);
    }
    // Absolute last resort
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

    // Find patients assigned to this room.
    // We look at:
    //  - registered_patient.assigned_room
    //  - patient_visits.room_no for visits today
    // and then create a visit for today for any patient that doesn't have one yet.
    // This way, all patients physically in the room become "today's patients".
    // Use CURRENT_DATE from database to ensure consistency with IST timezone.
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const todayDate = todayResult.rows[0]?.today || today;
    
    // Find patients in this room
    // Handle room format variations - compare as text to handle "205" vs "Room 205" etc.
    // Check both assigned_room from patient record and room_no from today's visit record
    const patientsResult = await db.query(
      `SELECT DISTINCT rp.id, rp.name, rp.assigned_doctor_id, DATE(rp.created_at) as created_date,
              rp.assigned_room, pv.room_no
       FROM registered_patient rp
       LEFT JOIN patient_visits pv ON rp.id = pv.patient_id AND DATE(pv.visit_date) = $2
       WHERE (
         -- Check if patient's assigned_room matches (as text to handle format variations)
         TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($1::text)
         -- OR check if today's visit room_no matches
         OR TRIM(COALESCE(pv.room_no::text, '')) = TRIM($1::text)
       )`,
      [roomNumber, todayDate]
    );

    const patients = patientsResult.rows;
    
    console.log(`[assignPatientsToDoctor] Query parameters: roomNumber="${roomNumber}", todayDate="${todayDate}"`);
    console.log(`[assignPatientsToDoctor] Found ${patients.length} patient(s) in room ${roomNumber} to assign to doctor ${doctorId} (${doctor.name})`);
    if (patients.length > 0) {
      console.log(`[assignPatientsToDoctor] Patient details:`, patients.map(p => ({
        id: p.id,
        name: p.name,
        assigned_room: p.assigned_room,
        visit_room_no: p.room_no,
        current_doctor_id: p.assigned_doctor_id
      })));
    } else {
      // Debug: Check if there are any patients with this room at all
      const debugResult = await db.query(
        `SELECT rp.id, rp.name, rp.assigned_room, pv.room_no, DATE(rp.created_at) as created_date
         FROM registered_patient rp
         LEFT JOIN patient_visits pv ON rp.id = pv.patient_id AND DATE(pv.visit_date) = $2
         WHERE (
           TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($1::text)
           OR TRIM(COALESCE(pv.room_no::text, '')) = TRIM($1::text)
         )
         LIMIT 10`,
        [roomNumber, todayDate]
      );
      console.log(`[assignPatientsToDoctor] DEBUG: Found ${debugResult.rows.length} patient(s) with room ${roomNumber} (any date):`, debugResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        assigned_room: r.assigned_room,
        visit_room_no: r.room_no,
        created_date: r.created_date
      })));
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
    // Also handle room format variations - check both assigned_room and visit room_no
    if (patientIds.length > 0) {
      for (const patientId of patientIds) {
        // Update patient record - use room format matching (text comparison)
        const updateResult = await db.query(
          `UPDATE registered_patient 
           SET assigned_doctor_id = $1, 
               assigned_doctor_name = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
             AND (
               TRIM(COALESCE(assigned_room::text, '')) = TRIM($4::text)
               OR EXISTS (
                 SELECT 1 FROM patient_visits pv 
                 WHERE pv.patient_id = registered_patient.id 
                   AND DATE(pv.visit_date) = $5
                   AND TRIM(COALESCE(pv.room_no::text, '')) = TRIM($4::text)
               )
             )`,
          [doctorId, doctor.name, patientId, roomNumber, todayDate]
        );
        
        console.log(`[assignPatientsToDoctor] Updated patient ${patientId}: ${updateResult.rowCount} row(s) affected`);
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
        const insertResult = await db.query(
          `INSERT INTO patient_visits 
           (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
           VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)
           RETURNING id`,
          [
            patient.id,
            todayDate,
            visitType,
            doctorId,
            roomNumber,
            `Auto-assigned to ${doctor.name} at ${assignmentTime}`
          ]
        );
        console.log(`[assignPatientsToDoctor] Created visit record for patient ${patient.id}: visit_id=${insertResult.rows[0]?.id}`);
      } else {
        // Update existing visit record
        const updateResult = await db.query(
          `UPDATE patient_visits 
           SET assigned_doctor_id = $1, room_no = $2, updated_at = CURRENT_TIMESTAMP
           WHERE patient_id = $3 AND DATE(visit_date) = $4
           RETURNING id`,
          [doctorId, roomNumber, patient.id, todayDate]
        );
        console.log(`[assignPatientsToDoctor] Updated visit record for patient ${patient.id}: ${updateResult.rowCount} row(s) affected`);
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
    // Use CURRENT_DATE from database to ensure consistency with IST timezone
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
    
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
  // autoAssignRoom - DEPRECATED: Room selection is now mandatory, no auto-assignment
  assignPatientsToDoctor,
  isRoomOccupied,
  hasRoomToday
};


