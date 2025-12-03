const db = require('../config/database');

class PatientVisit {
  // Get visit count for a patient
  static async getVisitCount(patient_id) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as visit_count 
         FROM patient_visits 
         WHERE patient_id = $1`,
        [patient_id]
      );
      return parseInt(result.rows[0]?.visit_count || 0, 10);
    } catch (error) {
      console.error('[PatientVisit.getVisitCount] Error:', error);
      throw error;
    }
  }

  // Get all visits for a patient (for history)
  static async getPatientVisits(patient_id) {
    try {
      const result = await db.query(
        `SELECT id, visit_date, visit_type, visit_status, assigned_doctor_id, room_no, notes, created_at
         FROM patient_visits 
         WHERE patient_id = $1
         ORDER BY visit_date DESC, created_at DESC`,
        [patient_id]
      );
      return result.rows || [];
    } catch (error) {
      console.error('[PatientVisit.getPatientVisits] Error:', error);
      throw error;
    }
  }

  static async assignPatient({ patient_id, assigned_doctor_id, room_no, visit_date, visit_type, notes }) {
    try {
      const dateToUse = visit_date || new Date().toISOString().slice(0, 10);
      
      // If visit_type not provided, determine based on existing visits
      let finalVisitType = visit_type;
      if (!finalVisitType) {
        const visitCount = await PatientVisit.getVisitCount(patient_id);
        finalVisitType = visitCount === 0 ? 'first_visit' : 'follow_up';
      }

      // Use PostgreSQL query
      const result = await db.query(
        `INSERT INTO patient_visits (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [patient_id, dateToUse, finalVisitType, false, assigned_doctor_id, room_no || null, 'scheduled', notes || null]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create patient visit');
      }

      return result.rows[0];
    } catch (error) {
      console.error('[PatientVisit.assignPatient] Error:', error);
      
      // Check for integer type errors
      const isTypeError = error.message && (
        error.message.includes('invalid input syntax for type integer') ||
        error.message.includes('type mismatch') ||
        error.code === '22P02' // PostgreSQL invalid input syntax error code
      );

      if (isTypeError) {
        if (error.message.includes('invalid input syntax for type integer')) {
          throw new Error(`Invalid patient_id format: Expected integer but received "${patient_id}". The patient_visits table uses integer for patient_id. Please ensure the patient record has a valid integer ID.`);
        }
        
        throw new Error(`Type mismatch error: ${error.message}`);
      }

      throw error;
    }
  }

  // Mark a visit as completed
  static async markVisitCompleted(visit_id) {
    try {
      const result = await db.query(
        `UPDATE patient_visits 
         SET visit_status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [visit_id]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Visit not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('[PatientVisit.markVisitCompleted] Error:', error);
      throw error;
    }
  }

  // Mark today's visit for a patient as completed
  // If no visit record exists, create one first
  static async markPatientVisitCompletedToday(patient_id, visit_date = null, assigned_doctor_id = null, room_no = null) {
    try {
      const dateToUse = visit_date || new Date().toISOString().slice(0, 10);
      
      // First, check if a visit exists for this patient and date
      const checkResult = await db.query(
        `SELECT id, visit_status 
         FROM patient_visits 
         WHERE patient_id = $1 AND visit_date = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [patient_id, dateToUse]
      );

      let visitId;
      
      if (!checkResult.rows || checkResult.rows.length === 0) {
        // No visit found - create one automatically
        // Get visit count to determine visit type
        const visitCount = await PatientVisit.getVisitCount(patient_id);
        const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';
        
        // Create visit record with 'scheduled' status first
        const createResult = await db.query(
          `INSERT INTO patient_visits (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, visit_status`,
          [patient_id, dateToUse, visitType, false, assigned_doctor_id || null, room_no || null, 'scheduled', 'Visit record created automatically when marking as completed']
        );
        
        if (!createResult.rows || createResult.rows.length === 0) {
          throw new Error('Failed to create visit record');
        }
        
        visitId = createResult.rows[0].id;
      } else {
        const existingVisit = checkResult.rows[0];
        
        // Check if already completed
        if (existingVisit.visit_status === 'completed') {
          return null; // Already completed
        }
        
        visitId = existingVisit.id;
      }
      
      // Update the visit status to completed
      const result = await db.query(
        `UPDATE patient_visits 
         SET visit_status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [visitId]
      );

      if (!result.rows || result.rows.length === 0) {
        return null; // No visit was updated (shouldn't happen, but safety check)
      }

      return result.rows[0];
    } catch (error) {
      console.error('[PatientVisit.markPatientVisitCompletedToday] Error:', error);
      throw error;
    }
  }

  // Auto-complete all incomplete visits from previous days
  // This should be called at the start of each day to mark old visits as completed
  static async autoCompleteOldVisits() {
    try {
      // Use CURRENT_DATE from database (which respects the database timezone)
      // This ensures we're comparing dates correctly regardless of server timezone
      // Find all visits that are:
      // 1. Not completed (status is 'scheduled' or 'in_progress')
      // 2. Visit date is before today (using database CURRENT_DATE)
      const result = await db.query(
        `UPDATE patient_visits 
         SET visit_status = 'completed', 
             updated_at = CURRENT_TIMESTAMP,
             notes = COALESCE(
               CASE 
                 WHEN notes IS NULL OR notes = '' THEN 'Auto-completed at start of new day'
                 ELSE notes || E'\\nAuto-completed at start of new day'
               END,
               'Auto-completed at start of new day'
             )
         WHERE visit_date < CURRENT_DATE
           AND visit_status IN ('scheduled', 'in_progress')
         RETURNING id, patient_id, visit_date, visit_status`
      );

      const completedCount = result.rows?.length || 0;
      
      if (completedCount > 0) {
        console.log(`[PatientVisit.autoCompleteOldVisits] ✅ Auto-completed ${completedCount} visit(s) from previous days`);
      }

      return {
        success: true,
        completedCount,
        visits: result.rows || []
      };
    } catch (error) {
      console.error('[PatientVisit.autoCompleteOldVisits] Error:', error);
      throw error;
    }
  }
}

module.exports = PatientVisit;
