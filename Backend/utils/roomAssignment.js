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
 * Get all available rooms from rooms table (active rooms).
 * When excludeOccupied=true, rooms that are AT capacity are excluded.
 * Rooms with remaining capacity (shared rooms partially filled) are still included.
 */
async function getAvailableRooms(excludeOccupied = true) {
  try {
    // Get active rooms with capacity from rooms table
    const roomsResult = await db.query(
      `SELECT room_number, doctor_capacity 
       FROM rooms 
       WHERE is_active = true
       ORDER BY room_number`
    );

    let allRooms = roomsResult.rows; // [{room_number, doctor_capacity}]
    let rooms = allRooms.map(r => r.room_number).filter(Boolean);

    // If no active rooms in table, fallback to discovering from patients
    if (rooms.length === 0) {
      const result = await db.query(
        `SELECT DISTINCT assigned_room 
         FROM registered_patient 
         WHERE assigned_room IS NOT NULL 
           AND assigned_room != ''
         ORDER BY assigned_room`
      );
      
      rooms = result.rows.map(row => row.assigned_room).filter(Boolean);
      allRooms = rooms.map(r => ({ room_number: r, doctor_capacity: 1 }));
      
      // If still no rooms, return default room numbers (1-10)
      if (rooms.length === 0) {
        rooms = Array.from({ length: 10 }, (_, i) => `Room ${i + 1}`);
        allRooms = rooms.map(r => ({ room_number: r, doctor_capacity: 1 }));
      }
    }

    // Exclude rooms that are AT capacity (fully occupied)
    if (excludeOccupied) {
      const capacityMap = {};
      for (const r of allRooms) {
        capacityMap[r.room_number] = r.doctor_capacity || 1;
      }
      // Build a map of room -> doctor count today
      const todayResult = await db.query('SELECT CURRENT_DATE as today');
      const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
      const occupancyResult = await db.query(
        `SELECT current_room, COUNT(*) as cnt
         FROM users
         WHERE current_room IS NOT NULL AND current_room != ''
           AND DATE(room_assignment_time) = $1
         GROUP BY current_room`,
        [today]
      );
      const occupancyMap = {};
      for (const row of occupancyResult.rows) {
        occupancyMap[row.current_room] = parseInt(row.cnt, 10);
      }
      rooms = rooms.filter(room => {
        const cap = capacityMap[room] || 1;
        const occ = occupancyMap[room] || 0;
        return occ < cap; // still has a slot
      });
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
    // Also include child patients from child_patient_registrations table
    const result = await db.query(
      `SELECT 
         room,
         SUM(patient_count) as patient_count
       FROM (
         -- Adult patients
         SELECT 
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
         
         UNION ALL
         
         -- Child patients
         SELECT 
           TRIM(COALESCE(cpr.assigned_room::text, '')) as room,
           COUNT(DISTINCT cpr.id) as patient_count
         FROM child_patient_registrations cpr
         WHERE DATE(cpr.created_at) = $1 
           AND cpr.assigned_room IS NOT NULL 
           AND TRIM(COALESCE(cpr.assigned_room::text, '')) != ''
           -- Only include rooms that exist in the rooms table (active rooms)
           AND (
             TRIM(COALESCE(cpr.assigned_room::text, '')) = ANY($2::text[])
             OR EXISTS (
               SELECT 1 FROM rooms r 
               WHERE r.is_active = true 
                 AND r.room_number = TRIM(COALESCE(cpr.assigned_room::text, ''))
             )
           )
         GROUP BY TRIM(COALESCE(cpr.assigned_room::text, ''))
         HAVING TRIM(COALESCE(cpr.assigned_room::text, '')) != ''
       ) combined
       GROUP BY room
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

    // Find patients for TODAY in this room only. Do not pull adults who merely have a stale
    // assigned_room from a previous day (fixes "yesterday's patient" appearing when selecting a room).
    // Adults: today's visit with this room_no OR registered today in this room OR updated today in this room (IST).
    // Children: same idea as ChildPatientRegistration date filter — created today OR updated today with room.
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const todayDate = todayResult.rows[0]?.today || today;
    
    const patientsResult = await db.query(
      `SELECT DISTINCT rp.id, rp.name, rp.assigned_doctor_id, DATE(rp.created_at) as created_date,
              rp.assigned_room, pv.room_no, 'adult' as patient_type
       FROM registered_patient rp
       LEFT JOIN patient_visits pv ON rp.id = pv.patient_id AND DATE(pv.visit_date) = $2::date
       WHERE (
         (
           pv.id IS NOT NULL
           AND TRIM(COALESCE(pv.room_no::text, '')) = TRIM($1::text)
         )
         OR (
           TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($1::text)
           AND DATE((rp.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') = $2::date
         )
         OR (
           TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($1::text)
           AND DATE((rp.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') = $2::date
         )
       )
       
       UNION ALL
       
       SELECT DISTINCT 
         cpr.id, 
         cpr.child_name as name, 
         NULL::integer as assigned_doctor_id, 
         DATE(cpr.created_at) as created_date,
         cpr.assigned_room, 
         NULL::text as room_no,
         'child' as patient_type
       FROM child_patient_registrations cpr
       WHERE TRIM(COALESCE(cpr.assigned_room::text, '')) = TRIM($1::text)
         AND (
           DATE((cpr.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') = $2::date
           OR (
             DATE((cpr.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') = $2::date
             AND TRIM(COALESCE(cpr.assigned_room::text, '')) != ''
           )
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
      const debugResult = await db.query(
        `SELECT rp.id, rp.name, rp.assigned_room, pv.room_no,
                DATE((rp.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') as created_ist
         FROM registered_patient rp
         LEFT JOIN patient_visits pv ON rp.id = pv.patient_id AND DATE(pv.visit_date) = $2::date
         WHERE TRIM(COALESCE(rp.assigned_room::text, '')) = TRIM($1::text)
         LIMIT 10`,
        [roomNumber, todayDate]
      );
      console.log(`[assignPatientsToDoctor] DEBUG: Adults with stale assigned_room ${roomNumber} (sample, not necessarily today):`, debugResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        assigned_room: r.assigned_room,
        visit_room_no: r.room_no,
        created_ist: r.created_ist
      })));
    }
    
    if (patients.length === 0) {
      // Normal when the doctor claims a room before any same-day registrations—selection must still succeed.
      console.log(`[assignPatientsToDoctor] No patients to assign in room ${roomNumber}`);
      return {
        assigned: 0,
        patients: []
      };
    }

    // Update patients to assign them to the doctor
    // Separate adult and child patients - only adult patients can be assigned to doctors
    const adultPatients = patients.filter(p => p.patient_type !== 'child');
    const childPatients = patients.filter(p => p.patient_type === 'child');
    const patientIds = adultPatients.map(p => p.id);
    
    // Update adult patients one by one to avoid array parameter issues
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

    // Note: Child patients are included in the room but cannot be assigned to doctors
    // as they are in a separate table (child_patient_registrations)
    if (childPatients.length > 0) {
      console.log(`[assignPatientsToDoctor] Found ${childPatients.length} child patient(s) in room ${roomNumber} (not assigned to doctor)`);
    }

    // Scheduling rows in patient_visits are only updated when they already exist
    // (e.g. created when a follow-up form is saved). Do not auto-create visits here —
    // registration and room assignment are not counted as consultations.
    for (const patient of adultPatients) {
      const visitCheck = await db.query(
        `SELECT id FROM patient_visits 
         WHERE patient_id = $1 AND DATE(visit_date) = $2::date`,
        [patient.id, todayDate]
      );

      if (visitCheck.rows.length > 0) {
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

    const totalPatients = patients.length;
    const assignedCount = adultPatients.length; // Only adult patients are assigned to doctors
    
    console.log(`[assignPatientsToDoctor] ✅ Found ${totalPatients} patient(s) in room ${roomNumber} (${assignedCount} adult(s) assigned to doctor, ${childPatients.length} child patient(s) in room)`);
    
    return {
      assigned: assignedCount,
      total: totalPatients,
      patients: patients.map(p => ({
        id: p.id,
        name: p.name,
        assigned_room: p.assigned_room,
        patient_type: p.patient_type || 'adult'
      }))
    };
  } catch (error) {
    console.error('[assignPatientsToDoctor] ❌ Error:', error);
    console.error('[assignPatientsToDoctor] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Get all doctors currently assigned to a room today.
 * @param {string} roomNumber
 * @param {number|null} excludeUserId - Omit this user from the result (for re-select checks)
 * @returns {Promise<Array<{id: number, name: string, role: string}>>}
 */
async function getDoctorsInRoomToday(roomNumber, excludeUserId = null) {
  try {
    const todayResult = await db.query('SELECT CURRENT_DATE as today');
    const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

    let query = `SELECT id, name, role
                 FROM users
                 WHERE current_room = $1
                   AND DATE(room_assignment_time) = $2`;
    const params = [roomNumber, today];

    if (excludeUserId) {
      query += ` AND id != $3`;
      params.push(excludeUserId);
    }

    query += ` ORDER BY room_assignment_time ASC`;

    const result = await db.query(query, params);
    return result.rows.map(r => ({ id: r.id, name: r.name, role: r.role }));
  } catch (error) {
    console.error('[getDoctorsInRoomToday] Error:', error);
    return [];
  }
}

/**
 * Get the doctor_capacity configured for a room (defaults to 1 if room not found or column missing).
 * @param {string} roomNumber
 * @returns {Promise<number>}
 */
async function getRoomDoctorCapacity(roomNumber) {
  try {
    const result = await db.query(
      `SELECT doctor_capacity FROM rooms WHERE room_number = $1 AND is_active = true LIMIT 1`,
      [roomNumber]
    );
    if (result.rows.length > 0 && result.rows[0].doctor_capacity != null) {
      return parseInt(result.rows[0].doctor_capacity, 10);
    }
    return 1; // safe default
  } catch (error) {
    console.error('[getRoomDoctorCapacity] Error:', error);
    return 1;
  }
}

/**
 * Check whether a doctor can join (select) a room today, respecting capacity.
 * @param {string} roomNumber
 * @param {number|null} excludeUserId - Current doctor's ID; excluded from occupant count to allow re-select
 * @returns {Promise<{allowed: boolean, doctors: Array, capacity: number, reason?: string}>}
 */
async function canJoinRoom(roomNumber, excludeUserId = null) {
  try {
    const [doctors, capacity] = await Promise.all([
      getDoctorsInRoomToday(roomNumber, excludeUserId),
      getRoomDoctorCapacity(roomNumber),
    ]);

    if (doctors.length >= capacity) {
      const names = doctors.map(d => `Dr. ${d.name}`).join(', ');
      return {
        allowed: false,
        doctors,
        capacity,
        reason: capacity === 1
          ? `Room ${roomNumber} is already assigned to ${names}. Only one doctor can be assigned to a room.`
          : `Room ${roomNumber} is full (${doctors.length}/${capacity} doctors: ${names}).`,
      };
    }

    return { allowed: true, doctors, capacity };
  } catch (error) {
    console.error('[canJoinRoom] Error:', error);
    // Fail open so a DB error doesn't permanently lock out doctors
    return { allowed: true, doctors: [], capacity: 1 };
  }
}

/**
 * Check if a room is already occupied by another doctor today (legacy helper kept for backward compat).
 * Use canJoinRoom for new capacity-aware logic.
 * @param {string} roomNumber
 * @param {number} excludeUserId
 */
async function isRoomOccupied(roomNumber, excludeUserId = null) {
  try {
    const joinCheck = await canJoinRoom(roomNumber, excludeUserId);
    if (!joinCheck.allowed) {
      return {
        occupied: true,
        doctor: joinCheck.doctors[0] || null,
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

/**
 * Ensure an adult patient has a visit row for today (PWO registration / room queue).
 * Idempotent: skips insert if a visit already exists for today.
 */
async function ensurePatientTodayVisit(patientId, roomNumber, assignedDoctorId = null) {
  if (!patientId || !roomNumber || String(roomNumber).trim() === '') {
    return { created: false, reason: 'missing_patient_or_room' };
  }

  const room = String(roomNumber).trim();
  const todayResult = await db.query('SELECT CURRENT_DATE as today');
  const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

  const visitCheck = await db.query(
    `SELECT id, assigned_doctor_id FROM patient_visits WHERE patient_id = $1 AND DATE(visit_date) = $2::date`,
    [patientId, todayDate]
  );

  if (visitCheck.rows.length > 0) {
    if (assignedDoctorId) {
      await db.query(
        `UPDATE patient_visits
         SET assigned_doctor_id = COALESCE(assigned_doctor_id, $1),
             room_no = COALESCE(NULLIF(TRIM(COALESCE(room_no::text, '')), ''), $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $3 AND DATE(visit_date) = $4::date`,
        [assignedDoctorId, room, patientId, todayDate]
      );
    }
    return { created: false, exists: true };
  }

  const visitCountResult = await db.query(
    `SELECT COUNT(*) as count FROM patient_visits WHERE patient_id = $1`,
    [patientId]
  );
  const visitCount = parseInt(visitCountResult.rows[0]?.count || 0, 10);
  const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

  await db.query(
    `INSERT INTO patient_visits
     (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
     VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)`,
    [
      patientId,
      todayDate,
      visitType,
      assignedDoctorId,
      room,
      'Registered for today\'s clinic',
    ]
  );

  return { created: true };
}

/**
 * When PWO registers a patient to a room that already has a doctor today,
 * assign the patient (and today's visit) to the first doctor in that room.
 * Mirrors the bulk assign in selectRoom but for a single new registration.
 */
async function assignNewPatientToRoomDoctor(patientId, roomNumber) {
  if (!patientId || !roomNumber || String(roomNumber).trim() === '') {
    return { assigned: false };
  }

  const room = String(roomNumber).trim();
  const doctors = await getDoctorsInRoomToday(room);
  if (doctors.length === 0) {
    return { assigned: false, reason: 'no_doctor_in_room' };
  }

  const doctor = doctors[0];
  const todayResult = await db.query('SELECT CURRENT_DATE as today');
  const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

  const doctorResult = await db.query('SELECT id, name, role FROM users WHERE id = $1', [doctor.id]);
  if (doctorResult.rows.length === 0) {
    return { assigned: false, reason: 'doctor_not_found' };
  }

  const doctorInfo = doctorResult.rows[0];
  const assignmentTime = new Date().toISOString();

  await db.query(
    `UPDATE registered_patient
     SET assigned_doctor_id = $1,
         assigned_doctor_name = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
       AND TRIM(COALESCE(assigned_room::text, '')) = TRIM($4::text)`,
    [doctorInfo.id, doctorInfo.name, patientId, room]
  );

  const visitCheck = await db.query(
    `SELECT id FROM patient_visits WHERE patient_id = $1 AND DATE(visit_date) = $2::date`,
    [patientId, todayDate]
  );

  if (visitCheck.rows.length === 0) {
    const visitCountResult = await db.query(
      `SELECT COUNT(*) as count FROM patient_visits WHERE patient_id = $1`,
      [patientId]
    );
    const visitCount = parseInt(visitCountResult.rows[0]?.count || 0, 10);
    const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

    await db.query(
      `INSERT INTO patient_visits
       (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
       VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)`,
      [
        patientId,
        todayDate,
        visitType,
        doctorInfo.id,
        room,
        `Auto-assigned to ${doctorInfo.name} on PWO registration at ${assignmentTime}`,
      ]
    );
  } else {
    await db.query(
      `UPDATE patient_visits
       SET assigned_doctor_id = $1, room_no = $2, updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $3 AND DATE(visit_date) = $4`,
      [doctorInfo.id, room, patientId, todayDate]
    );
  }

  console.log(
    `[assignNewPatientToRoomDoctor] Patient ${patientId} → doctor ${doctorInfo.id} (${doctorInfo.name}) in room ${room}`
  );

  return {
    assigned: true,
    doctor_id: doctorInfo.id,
    doctor_name: doctorInfo.name,
  };
}

/**
 * Assign a single unassigned adult patient to a specific doctor (manual "Add to my list").
 */
async function assignPatientToDoctorById(patientId, doctorId) {
  const patientIdInt = parseInt(patientId, 10);
  const doctorIdInt = parseInt(doctorId, 10);
  if (isNaN(patientIdInt) || isNaN(doctorIdInt)) {
    throw new Error('Invalid patient or doctor ID');
  }

  const patientResult = await db.query(
    `SELECT id, name, assigned_room, assigned_doctor_id, assigned_doctor_name
     FROM registered_patient WHERE id = $1`,
    [patientIdInt]
  );
  if (patientResult.rows.length === 0) {
    return { success: false, code: 'NOT_FOUND', message: 'Patient not found' };
  }

  const patient = patientResult.rows[0];
  if (patient.assigned_doctor_id != null) {
    return {
      success: false,
      code: 'ALREADY_ASSIGNED',
      message: patient.assigned_doctor_name
        ? `Patient is already assigned to ${patient.assigned_doctor_name}`
        : 'Patient is already assigned to a doctor',
    };
  }

  const doctorResult = await db.query(
    'SELECT id, name, role FROM users WHERE id = $1',
    [doctorIdInt]
  );
  if (doctorResult.rows.length === 0) {
    return { success: false, code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' };
  }

  const doctorInfo = doctorResult.rows[0];
  const allowedRoles = ['Admin', 'Faculty', 'Resident'];
  if (!allowedRoles.includes(doctorInfo.role)) {
    return { success: false, code: 'INVALID_DOCTOR', message: 'Only clinical staff can claim patients' };
  }

  const roomStatus = await hasRoomToday(doctorIdInt);
  const patientRoom =
    patient.assigned_room && String(patient.assigned_room).trim() !== ''
      ? String(patient.assigned_room).trim()
      : null;
  const roomToUse = patientRoom || roomStatus.room || null;

  const todayResult = await db.query('SELECT CURRENT_DATE as today');
  const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
  const assignmentTime = new Date().toISOString();

  if (roomToUse) {
    await db.query(
      `UPDATE registered_patient
       SET assigned_doctor_id = $1,
           assigned_doctor_name = $2,
           assigned_room = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [doctorInfo.id, doctorInfo.name, roomToUse, patientIdInt]
    );
  } else {
    await db.query(
      `UPDATE registered_patient
       SET assigned_doctor_id = $1,
           assigned_doctor_name = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [doctorInfo.id, doctorInfo.name, patientIdInt]
    );
  }

  const visitCheck = await db.query(
    `SELECT id FROM patient_visits WHERE patient_id = $1 AND DATE(visit_date) = $2::date`,
    [patientIdInt, todayDate]
  );

  if (visitCheck.rows.length === 0) {
    const visitCountResult = await db.query(
      `SELECT COUNT(*) as count FROM patient_visits WHERE patient_id = $1`,
      [patientIdInt]
    );
    const visitCount = parseInt(visitCountResult.rows[0]?.count || 0, 10);
    const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

    await db.query(
      `INSERT INTO patient_visits
       (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
       VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)`,
      [
        patientIdInt,
        todayDate,
        visitType,
        doctorInfo.id,
        roomToUse,
        `Added to ${doctorInfo.name}'s patient list at ${assignmentTime}`,
      ]
    );
  } else {
    await db.query(
      `UPDATE patient_visits
       SET assigned_doctor_id = $1,
           room_no = COALESCE($2, room_no),
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $3 AND DATE(visit_date) = $4`,
      [doctorInfo.id, roomToUse, patientIdInt, todayDate]
    );
  }

  console.log(
    `[assignPatientToDoctorById] Patient ${patientIdInt} → doctor ${doctorInfo.id} (${doctorInfo.name})`
  );

  return {
    success: true,
    doctor_id: doctorInfo.id,
    doctor_name: doctorInfo.name,
    room: roomToUse,
  };
}

/**
 * Link an unassigned child patient to a doctor via follow-up visit (child has no assigned_doctor_id column).
 */
async function assignChildPatientToDoctorById(childPatientId, doctorId) {
  const childId = parseInt(childPatientId, 10);
  const doctorIdInt = parseInt(doctorId, 10);
  if (isNaN(childId) || isNaN(doctorIdInt)) {
    throw new Error('Invalid child patient or doctor ID');
  }

  const childResult = await db.query(
    `SELECT id, child_name, assigned_room FROM child_patient_registrations WHERE id = $1`,
    [childId]
  );
  if (childResult.rows.length === 0) {
    return { success: false, code: 'NOT_FOUND', message: 'Child patient not found' };
  }

  const child = childResult.rows[0];
  const alreadyLinked = await db.query(
    `SELECT 1 FROM followup_visits fv
     WHERE fv.child_patient_id = $1 AND fv.assigned_doctor_id IS NOT NULL
     LIMIT 1`,
    [childId]
  );
  if (alreadyLinked.rows.length > 0) {
    return {
      success: false,
      code: 'ALREADY_ASSIGNED',
      message: 'Child patient is already linked to a treating doctor',
    };
  }

  const proformaLinked = await db.query(
    `SELECT 1 FROM child_clinical_proforma ccp
     WHERE ccp.child_patient_id = $1
       AND (ccp.assigned_doctor IS NOT NULL OR ccp.filled_by IS NOT NULL)
     LIMIT 1`,
    [childId]
  );
  if (proformaLinked.rows.length > 0) {
    return {
      success: false,
      code: 'ALREADY_ASSIGNED',
      message: 'Child patient is already linked via clinical proforma',
    };
  }

  const doctorResult = await db.query('SELECT id, name, role FROM users WHERE id = $1', [doctorIdInt]);
  if (doctorResult.rows.length === 0) {
    return { success: false, code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' };
  }
  const doctorInfo = doctorResult.rows[0];

  const roomStatus = await hasRoomToday(doctorIdInt);
  const childRoom =
    child.assigned_room && String(child.assigned_room).trim() !== ''
      ? String(child.assigned_room).trim()
      : null;
  const roomToUse = childRoom || roomStatus.room || null;

  const todayResult = await db.query('SELECT CURRENT_DATE as today');
  const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

  const existingToday = await db.query(
    `SELECT id FROM followup_visits WHERE child_patient_id = $1 AND DATE(visit_date) = $2::date LIMIT 1`,
    [childId, todayDate]
  );

  if (existingToday.rows.length > 0) {
    await db.query(
      `UPDATE followup_visits
       SET assigned_doctor_id = $1, filled_by = $1, room_no = COALESCE($2, room_no), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [doctorInfo.id, roomToUse, existingToday.rows[0].id]
    );
  } else {
    await db.query(
      `INSERT INTO followup_visits
       (child_patient_id, visit_date, clinical_assessment, filled_by, assigned_doctor_id, room_no, visit_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')`,
      [
        childId,
        todayDate,
        `Added to ${doctorInfo.name}'s patient list`,
        doctorInfo.id,
        doctorInfo.id,
        roomToUse,
      ]
    );
  }

  if (roomToUse) {
    await db.query(
      `UPDATE child_patient_registrations SET assigned_room = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [roomToUse, childId]
    );
  } else {
    await db.query(
      `UPDATE child_patient_registrations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [childId]
    );
  }

  console.log(
    `[assignChildPatientToDoctorById] Child ${childId} → doctor ${doctorInfo.id} (${doctorInfo.name})`
  );

  return {
    success: true,
    doctor_id: doctorInfo.id,
    doctor_name: doctorInfo.name,
    room: roomToUse,
    patient_name: child.child_name,
  };
}

module.exports = {
  getAvailableRooms,
  getOccupiedRooms,
  getRoomDistribution,
  getTodayRoomDistribution,
  // autoAssignRoom - DEPRECATED: Room selection is now mandatory, no auto-assignment
  assignPatientsToDoctor,
  ensurePatientTodayVisit,
  assignNewPatientToRoomDoctor,
  assignPatientToDoctorById,
  assignChildPatientToDoctorById,
  // Capacity-aware helpers (new)
  getDoctorsInRoomToday,
  getRoomDoctorCapacity,
  canJoinRoom,
  // isRoomOccupied kept for backward compatibility; internally uses canJoinRoom
  isRoomOccupied,
  hasRoomToday
};


