const db = require('../config/database');

class Prescription {
  constructor(data) {
    this.id = data.id;
    this.patient_id = data.patient_id;
    this.clinical_proforma_id = data.clinical_proforma_id;
    
    // Handle prescriptions from JSONB column
    if (data.prescriptions) {
      // If it's already an array, use it directly
      if (Array.isArray(data.prescriptions)) {
        this.prescription = data.prescriptions;
      } 
      // If it's a JSONB string, parse it
      else if (typeof data.prescriptions === 'string') {
        try {
          this.prescription = JSON.parse(data.prescriptions);
        } catch (e) {
          this.prescription = [];
        }
      }
      // If it's already a parsed object, use it
      else {
        this.prescription = data.prescriptions;
      }
    }
    // Handle legacy 'prescription' field name (for API compatibility)
    else if (data.prescription && Array.isArray(data.prescription)) {
      this.prescription = data.prescription;
    } else {
      // Empty prescription array
      this.prescription = [];
    }
    
    // Additional metadata from joins (when fetched by patient_id)
    this.visit_date = data.visit_date;
    this.visit_type = data.visit_type;
    
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(prescriptionData) {
    try {
      const {
        patient_id,
        clinical_proforma_id,
        prescription,
        prescriptions
      } = prescriptionData;
  
      // Validate required fields - patient_id is required, clinical_proforma_id is optional
      if (!patient_id) {
        throw new Error("patient_id is required");
      }

      // Handle both 'prescription' and 'prescriptions' field names
      // Allow empty arrays - no validation required
      let prescriptionArray = [];
      if (prescription && Array.isArray(prescription)) {
        prescriptionArray = prescription;
      } else if (prescriptions && Array.isArray(prescriptions)) {
        prescriptionArray = prescriptions;
      }
      // If no prescription array provided, use empty array (no error thrown)

      // Validate and clean prescription array (allow empty)
      const validPrescriptions = prescriptionArray
        .map((item, index) => ({
          id: item.id ? parseInt(item.id) : (index + 1),
          medicine: item.medicine && item.medicine.trim() ? item.medicine.trim() : null,
          dosage: item.dosage || null,
          when_to_take: item.when_to_take || item.when || null,
          frequency: item.frequency || null,
          duration: item.duration || null,
          quantity: item.quantity || item.qty || null,
          details: item.details || null,
          notes: item.notes || null
        }))
        .filter(item => item.medicine !== null); // Remove items without medicine

      // Allow empty prescriptions - no validation error

      // Delete existing prescription for this clinical_proforma_id (if provided)
      // If no clinical_proforma_id, we don't delete existing - allow multiple prescriptions per patient
      if (clinical_proforma_id) {
        await db.query(
          'DELETE FROM prescriptions WHERE clinical_proforma_id = $1',
          [clinical_proforma_id]
        );
      }

      // Insert new prescription with JSONB
      // clinical_proforma_id can be null - prescriptions can be linked to patient only
      const result = await db.query(
        `INSERT INTO prescriptions (
           patient_id,
           clinical_proforma_id,
           prescriptions
         )
         VALUES ($1, $2, $3::jsonb)
         RETURNING *`,
        [
          patient_id,
          clinical_proforma_id || null,
          JSON.stringify(validPrescriptions)
        ]
      );

      const row = result.rows[0];
      
      // Parse JSONB back to array
      const prescriptionsArray = typeof row.prescriptions === 'string' 
        ? JSON.parse(row.prescriptions) 
        : row.prescriptions;

      return new Prescription({
        id: row.id,
        patient_id: row.patient_id,
        clinical_proforma_id: row.clinical_proforma_id,
        prescriptions: prescriptionsArray,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    } catch (error) {
      console.error("Prescription Create Error:", error);
      throw error;
    }
  }

  static async findByClinicalProformaId(clinical_proforma_id) {
    try {
      const result = await db.query(
        'SELECT * FROM prescriptions WHERE clinical_proforma_id = $1',
        [clinical_proforma_id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Parse JSONB to array
      const prescriptionsArray = typeof row.prescriptions === 'string' 
        ? JSON.parse(row.prescriptions) 
        : row.prescriptions;

      return new Prescription({
        id: row.id,
        patient_id: row.patient_id,
        clinical_proforma_id: row.clinical_proforma_id,
        prescriptions: prescriptionsArray,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    } catch (error) {
      throw error;
    }
  }

  // Find all prescriptions by patient_id (including those without clinical_proforma_id)
  static async findByPatientId(patient_id) {
    try {
      const result = await db.query(
        `SELECT p.*, cp.visit_date, cp.visit_type 
         FROM prescriptions p
         LEFT JOIN clinical_proforma cp ON p.clinical_proforma_id = cp.id
         WHERE p.patient_id = $1
         ORDER BY p.created_at DESC`,
        [patient_id]
      );

      if (result.rows.length === 0) {
        return [];
      }

      return result.rows.map(row => {
        // Parse JSONB to array
        const prescriptionsArray = typeof row.prescriptions === 'string' 
          ? JSON.parse(row.prescriptions) 
          : row.prescriptions;

        return new Prescription({
          id: row.id,
          patient_id: row.patient_id,
          clinical_proforma_id: row.clinical_proforma_id,
          prescriptions: prescriptionsArray,
          visit_date: row.visit_date,
          visit_type: row.visit_type,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      });
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM prescriptions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Parse JSONB to array
      const prescriptionsArray = typeof row.prescriptions === 'string' 
        ? JSON.parse(row.prescriptions) 
        : row.prescriptions;

      return new Prescription({
        id: row.id,
        patient_id: row.patient_id,
        clinical_proforma_id: row.clinical_proforma_id,
        prescriptions: prescriptionsArray,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    } catch (error) {
      throw error;
    }
  }

  // Get all prescriptions with pagination and filters
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT pr.*, 
               p.name as patient_name, p.cr_no, p.psy_no,
               cp.visit_date as proforma_visit_date,
               cp.doctor_decision,
               u.name as doctor_name, u.role as doctor_role
        FROM prescriptions pr
        LEFT JOIN registered_patient p ON pr.patient_id = p.id
        LEFT JOIN clinical_proforma cp ON pr.clinical_proforma_id = cp.id
        LEFT JOIN users u ON cp.assigned_doctor = u.id
        WHERE 1=1
      `;
      let countQuery = 'SELECT COUNT(*) FROM prescriptions pr WHERE 1=1';
      const params = [];
      let paramCount = 0;

      // Apply filters
      if (filters.patient_id) {
        paramCount++;
        query += ` AND pr.patient_id = $${paramCount}`;
        countQuery += ` AND pr.patient_id = $${paramCount}`;
        params.push(parseInt(filters.patient_id));
      }

      if (filters.clinical_proforma_id) {
        paramCount++;
        query += ` AND pr.clinical_proforma_id = $${paramCount}`;
        countQuery += ` AND pr.clinical_proforma_id = $${paramCount}`;
        params.push(parseInt(filters.clinical_proforma_id));
      }

      if (filters.doctor_decision) {
        paramCount++;
        query += ` AND cp.doctor_decision = $${paramCount}`;
        countQuery += ` AND cp.doctor_decision = $${paramCount}`;
        params.push(filters.doctor_decision);
      }

      // Order by created_at descending
      query += ` ORDER BY pr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const [prescriptionsResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, params.slice(0, paramCount))
      ]);

      const prescriptions = prescriptionsResult.rows.map(row => {
        // Parse JSONB to array
        const prescriptionsArray = typeof row.prescriptions === 'string' 
          ? JSON.parse(row.prescriptions) 
          : row.prescriptions;

        return new Prescription({
          id: row.id,
          patient_id: row.patient_id,
          clinical_proforma_id: row.clinical_proforma_id,
          prescriptions: prescriptionsArray,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      });

      const total = parseInt(countResult.rows[0].count);

      return {
        prescriptions,
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

  async update(updateData) {
    try {
      // If prescription array is provided, replace entire prescriptions JSONB
      if (updateData.prescription && Array.isArray(updateData.prescription)) {
        const validPrescriptions = updateData.prescription
          .map((item, index) => ({
            id: item.id ? parseInt(item.id) : (index + 1),
            medicine: item.medicine && item.medicine.trim() ? item.medicine.trim() : null,
            dosage: item.dosage || null,
            when_to_take: item.when_to_take || item.when || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: item.quantity || item.qty || null,
            details: item.details || null,
            notes: item.notes || null
          }))
          .filter(item => item.medicine !== null);

        // Allow empty prescriptions - no validation error

        // Determine which field to use for WHERE clause
        const whereField = this.id ? 'id' : 'clinical_proforma_id';
        const whereValue = this.id || this.clinical_proforma_id;

        // Update prescriptions JSONB column
        const result = await db.query(
          `UPDATE prescriptions 
           SET prescriptions = $1::jsonb,
               patient_id = COALESCE($2, patient_id),
               updated_at = CURRENT_TIMESTAMP
           WHERE ${whereField} = $3
           RETURNING *`,
          [
            JSON.stringify(validPrescriptions),
            updateData.patient_id || this.patient_id,
            whereValue
          ]
        );

        if (result.rows.length === 0) {
          throw new Error("Prescription not found");
        }

        const row = result.rows[0];
        const prescriptionsArray = typeof row.prescriptions === 'string' 
          ? JSON.parse(row.prescriptions) 
          : row.prescriptions;

        this.prescription = prescriptionsArray;
        this.patient_id = row.patient_id;
        this.id = row.id;
        this.updated_at = row.updated_at;

        return this;
      }

      // Handle legacy prescriptions array format
      if (updateData.prescriptions && Array.isArray(updateData.prescriptions)) {
        const validPrescriptions = updateData.prescriptions
          .map((item, index) => ({
            id: item.id ? parseInt(item.id) : (index + 1),
            medicine: item.medicine && item.medicine.trim() ? item.medicine.trim() : null,
            dosage: item.dosage || null,
            when_to_take: item.when_to_take || item.when || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: item.quantity || item.qty || null,
            details: item.details || null,
            notes: item.notes || null
          }))
          .filter(item => item.medicine !== null);

        // Allow empty prescriptions - no validation error

        // Determine which field to use for WHERE clause
        const whereField = this.id ? 'id' : 'clinical_proforma_id';
        const whereValue = this.id || this.clinical_proforma_id;

        const result = await db.query(
          `UPDATE prescriptions 
           SET prescriptions = $1::jsonb,
               patient_id = COALESCE($2, patient_id),
               updated_at = CURRENT_TIMESTAMP
           WHERE ${whereField} = $3
           RETURNING *`,
          [
            JSON.stringify(validPrescriptions),
            updateData.patient_id || this.patient_id,
            whereValue
          ]
        );

        if (result.rows.length === 0) {
          throw new Error("Prescription not found");
        }

        const row = result.rows[0];
        const prescriptionsArray = typeof row.prescriptions === 'string' 
          ? JSON.parse(row.prescriptions) 
          : row.prescriptions;

        this.prescription = prescriptionsArray;
        this.patient_id = row.patient_id;
        this.id = row.id;
        this.updated_at = row.updated_at;

        return this;
      }

      // Update patient_id only if provided
      if (updateData.patient_id !== undefined) {
        const whereField = this.id ? 'id' : 'clinical_proforma_id';
        const whereValue = this.id || this.clinical_proforma_id;
        
        await db.query(
          `UPDATE prescriptions 
           SET patient_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE ${whereField} = $2`,
          [updateData.patient_id, whereValue]
        );
        this.patient_id = updateData.patient_id;
      }

      return this;
    } catch (error) {
      throw error;
    }
  }

  async delete() {
    try {
      await db.query('DELETE FROM prescriptions WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async deleteByClinicalProformaId(clinical_proforma_id) {
    try {
      const result = await db.query(
        'DELETE FROM prescriptions WHERE clinical_proforma_id = $1 RETURNING id',
        [clinical_proforma_id]
      );
      return result.rows.length;
    } catch (error) {
      throw error;
    }
  }

  toJSON() {
    const json = {
      id: this.id,
      patient_id: this.patient_id,
      clinical_proforma_id: this.clinical_proforma_id,
      prescription: this.prescription || [],
      created_at: this.created_at,
      updated_at: this.updated_at
    };
    
    // Include visit info if available (from patient query joins)
    if (this.visit_date) json.visit_date = this.visit_date;
    if (this.visit_type) json.visit_type = this.visit_type;
    
    return json;
  }
}

module.exports = Prescription;
