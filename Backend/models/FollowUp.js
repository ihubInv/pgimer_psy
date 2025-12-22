const db = require('../config/database');

class FollowUp {
  constructor(data) {
    this.id = data.id;
    this.patient_id = data.patient_id;
    this.visit_id = data.visit_id;
    this.visit_date = data.visit_date;
    this.clinical_assessment = data.clinical_assessment;
    this.filled_by = data.filled_by;
    this.assigned_doctor_id = data.assigned_doctor_id;
    this.room_no = data.room_no;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      patient_id: this.patient_id,
      visit_id: this.visit_id,
      visit_date: this.visit_date,
      clinical_assessment: this.clinical_assessment,
      filled_by: this.filled_by,
      assigned_doctor_id: this.assigned_doctor_id,
      room_no: this.room_no,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  // Create a new follow-up visit
  static async create(followUpData) {
    try {
      const {
        patient_id,
        visit_id,
        visit_date,
        clinical_assessment,
        filled_by,
        assigned_doctor_id,
        room_no,
      } = followUpData;

      // Validate required fields
      if (!patient_id) {
        throw new Error('patient_id is required');
      }
      if (!visit_date) {
        throw new Error('visit_date is required');
      }
      if (!clinical_assessment || !clinical_assessment.trim()) {
        throw new Error('clinical_assessment is required');
      }
      if (!filled_by) {
        throw new Error('filled_by is required');
      }

      // Insert follow-up visit
      const result = await db.query(
        `INSERT INTO followup_visits 
         (patient_id, visit_id, visit_date, clinical_assessment, filled_by, assigned_doctor_id, room_no)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          patient_id,
          visit_id || null,
          visit_date,
          clinical_assessment.trim(),
          filled_by,
          assigned_doctor_id || null,
          room_no || null,
        ]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create follow-up visit');
      }

      return new FollowUp(result.rows[0]);
    } catch (error) {
      console.error('[FollowUp.create] Error:', error);
      throw error;
    }
  }

  // Find follow-up by ID
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM followup_visits WHERE id = $1 AND is_active = true',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new FollowUp(result.rows[0]);
    } catch (error) {
      console.error('[FollowUp.findById] Error:', error);
      throw error;
    }
  }

  // Find all follow-ups for a patient
  static async findByPatientId(patient_id, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const result = await db.query(
        `SELECT * FROM followup_visits 
         WHERE patient_id = $1 AND is_active = true 
         ORDER BY visit_date DESC, created_at DESC
         LIMIT $2 OFFSET $3`,
        [patient_id, limit, offset]
      );

      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM followup_visits WHERE patient_id = $1 AND is_active = true',
        [patient_id]
      );

      return {
        followups: result.rows.map(row => new FollowUp(row)),
        total: parseInt(countResult.rows[0].total, 10),
        page,
        limit,
        pages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
      };
    } catch (error) {
      console.error('[FollowUp.findByPatientId] Error:', error);
      throw error;
    }
  }

  // Update follow-up visit
  static async update(id, updateData) {
    try {
      const {
        visit_date,
        clinical_assessment,
        assigned_doctor_id,
        room_no,
      } = updateData;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (visit_date !== undefined) {
        updates.push(`visit_date = $${paramCount++}`);
        values.push(visit_date);
      }

      if (clinical_assessment !== undefined) {
        updates.push(`clinical_assessment = $${paramCount++}`);
        values.push(clinical_assessment.trim());
      }

      if (assigned_doctor_id !== undefined) {
        updates.push(`assigned_doctor_id = $${paramCount++}`);
        values.push(assigned_doctor_id);
      }

      if (room_no !== undefined) {
        updates.push(`room_no = $${paramCount++}`);
        values.push(room_no);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await db.query(
        `UPDATE followup_visits 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount} AND is_active = true
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new FollowUp(result.rows[0]);
    } catch (error) {
      console.error('[FollowUp.update] Error:', error);
      throw error;
    }
  }

  // Soft delete (set is_active to false)
  static async delete(id) {
    try {
      const result = await db.query(
        `UPDATE followup_visits 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new FollowUp(result.rows[0]);
    } catch (error) {
      console.error('[FollowUp.delete] Error:', error);
      throw error;
    }
  }
}

module.exports = FollowUp;



