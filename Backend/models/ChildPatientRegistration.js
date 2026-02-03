// models/ChildPatientRegistration.js
const db = require('../config/database');

class ChildPatientRegistration {
  constructor(data = {}) {
    // Visit Details
    this.id = data.id || null;
    this.seen_as_walk_in_on = data.seen_as_walk_in_on || null;
    
    // Identification Details
    this.cr_number = data.cr_number || null;
    this.cgc_number = data.cgc_number || null;
    
    // Address Details
    this.address_line = data.address_line || null;
    this.city_town_village = data.city_town_village || null;
    this.district = data.district || null;
    this.state = data.state || null;
    this.country = data.country || 'India';
    this.pincode = data.pincode || null;
    
    // Child Personal Information
    this.child_name = data.child_name || null;
    this.sex = data.sex || null;
    this.mobile_no = data.mobile_no || null;
    this.age = data.age || null;
    
    // Age Group
    this.age_group = data.age_group || null;
    
    // Educational Status
    this.educational_status = data.educational_status || null;
    
    // Occupational Status
    this.occupational_status = data.occupational_status || null;
    
    // Religion
    this.religion = data.religion || null;
    
    // Head of Family Details
    this.head_name = data.head_name || null;
    this.head_relationship = data.head_relationship || null;
    this.head_age = data.head_age || null;
    this.head_education = data.head_education || null;
    this.head_occupation = data.head_occupation || null;
    this.head_monthly_income = data.head_monthly_income || null;
    
    // Locality
    this.locality = data.locality || null;
    
    // Distance Travelled
    this.distance_travelled = data.distance_travelled || null;
    
    // Source of Referral
    this.source_of_referral = data.source_of_referral || null;
    
    // Present Address
    this.present_address_line = data.present_address_line || null;
    this.present_city_town_village = data.present_city_town_village || null;
    this.present_district = data.present_district || null;
    this.present_state = data.present_state || null;
    this.present_country = data.present_country || null;
    this.present_pincode = data.present_pincode || null;
    
    // Permanent Address
    this.permanent_address_line = data.permanent_address_line || null;
    this.permanent_city_town_village = data.permanent_city_town_village || null;
    this.permanent_district = data.permanent_district || null;
    this.permanent_state = data.permanent_state || null;
    this.permanent_country = data.permanent_country || null;
    this.permanent_pincode = data.permanent_pincode || null;
    
    // Local Address
    this.local_address_line = data.local_address_line || null;
    this.local_city_town_village = data.local_city_town_village || null;
    this.local_district = data.local_district || null;
    this.local_state = data.local_state || null;
    this.local_country = data.local_country || null;
    this.local_pincode = data.local_pincode || null;
    
    // Assigned Room
    this.assigned_room = data.assigned_room || null;
    
    // Documents & Files
    this.documents = data.documents || (Array.isArray(data.documents) ? data.documents : []);
    this.photo_path = data.photo_path || null;
    
    // Metadata
    this.filled_by = data.filled_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      seen_as_walk_in_on: this.seen_as_walk_in_on,
      cr_number: this.cr_number,
      cgc_number: this.cgc_number,
      address_line: this.address_line,
      city_town_village: this.city_town_village,
      district: this.district,
      state: this.state,
      country: this.country,
      pincode: this.pincode,
      child_name: this.child_name,
      sex: this.sex,
      mobile_no: this.mobile_no,
      age: this.age,
      age_group: this.age_group,
      educational_status: this.educational_status,
      occupational_status: this.occupational_status,
      religion: this.religion,
      head_name: this.head_name,
      head_relationship: this.head_relationship,
      head_age: this.head_age,
      head_education: this.head_education,
      head_occupation: this.head_occupation,
      head_monthly_income: this.head_monthly_income,
      locality: this.locality,
      distance_travelled: this.distance_travelled,
      source_of_referral: this.source_of_referral,
      present_address_line: this.present_address_line,
      present_city_town_village: this.present_city_town_village,
      present_district: this.present_district,
      present_state: this.present_state,
      present_country: this.present_country,
      present_pincode: this.present_pincode,
      permanent_address_line: this.permanent_address_line,
      permanent_city_town_village: this.permanent_city_town_village,
      permanent_district: this.permanent_district,
      permanent_state: this.permanent_state,
      permanent_country: this.permanent_country,
      permanent_pincode: this.permanent_pincode,
      local_address_line: this.local_address_line,
      local_city_town_village: this.local_city_town_village,
      local_district: this.local_district,
      local_state: this.local_state,
      local_country: this.local_country,
      local_pincode: this.local_pincode,
      assigned_room: this.assigned_room,
      documents: this.documents,
      photo_path: this.photo_path,
      filled_by: this.filled_by,
      filled_by_name: this.filled_by_name,
      filled_by_role: this.filled_by_role,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Create new child patient registration
  static async create(childPatientData) {
    try {
      const {
        seen_as_walk_in_on,
        cr_number,
        cgc_number,
        address_line,
        city_town_village,
        district,
        state,
        country,
        pincode,
        child_name,
        sex,
        mobile_no,
        age,
        age_group,
        educational_status,
        occupational_status,
        religion,
        head_name,
        head_relationship,
        head_age,
        head_education,
        head_occupation,
        head_monthly_income,
        locality,
        distance_travelled,
        source_of_referral,
        present_address_line,
        present_city_town_village,
        present_district,
        present_state,
        present_country,
        present_pincode,
        permanent_address_line,
        permanent_city_town_village,
        permanent_district,
        permanent_state,
        permanent_country,
        permanent_pincode,
        local_address_line,
        local_city_town_village,
        local_district,
        local_state,
        local_country,
        local_pincode,
        assigned_room,
        documents,
        photo_path,
        filled_by
      } = childPatientData;

      // Validate required fields
      if (!child_name || child_name.trim() === '') {
        throw new Error('Child name is required');
      }

      // Build dynamic INSERT query
      const fields = [];
      const values = [];
      const placeholders = [];
      let paramCount = 0;

      // Required field
      fields.push('child_name');
      placeholders.push(`$${++paramCount}`);
      values.push(child_name.trim());

      // Optional fields - only include if they have values
      const optionalFields = {
        seen_as_walk_in_on,
        cr_number,
        cgc_number,
        address_line,
        city_town_village,
        district,
        state,
        country,
        pincode,
        sex,
        mobile_no,
        age,
        age_group,
        educational_status,
        occupational_status,
        religion,
        head_name,
        head_relationship,
        head_age,
        head_education,
        head_occupation,
        head_monthly_income,
        locality,
        distance_travelled,
        source_of_referral,
        present_address_line,
        present_city_town_village,
        present_district,
        present_state,
        present_country,
        present_pincode,
        permanent_address_line,
        permanent_city_town_village,
        permanent_district,
        permanent_state,
        permanent_country,
        permanent_pincode,
        local_address_line,
        local_city_town_village,
        local_district,
        local_state,
        local_country,
        local_pincode,
        assigned_room,
        photo_path,
        filled_by
      };

      // Add optional fields that have values
      for (const [fieldName, fieldValue] of Object.entries(optionalFields)) {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          fields.push(fieldName);
          placeholders.push(`$${++paramCount}`);
          values.push(fieldValue);
        }
      }

      // Handle documents JSONB array
      if (documents && Array.isArray(documents) && documents.length > 0) {
        fields.push('documents');
        placeholders.push(`$${++paramCount}`);
        values.push(JSON.stringify(documents));
      }

      // Add created_at timestamp
      fields.push('created_at');
      placeholders.push('CURRENT_TIMESTAMP');

      // Build and execute INSERT query
      const query = `
        INSERT INTO child_patient_registrations (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      console.log(`[ChildPatientRegistration.create] Inserting child patient with ${fields.length} fields`);

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create child patient registration: No row returned');
      }

      return new ChildPatientRegistration(result.rows[0]);
    } catch (error) {
      console.error('[ChildPatientRegistration.create] Error creating child patient:', error);
      throw error;
    }
  }

  // Find by ID
  static async findById(id) {
    try {
      if (!id) {
        return null;
      }

      const patientId = parseInt(id, 10);
      if (isNaN(patientId) || patientId <= 0) {
        return null;
      }

      const query = `
        SELECT * FROM child_patient_registrations
        WHERE id = $1
      `;

      const result = await db.query(query, [patientId]);

      if (result.rows.length === 0) {
        return null;
      }

      return new ChildPatientRegistration(result.rows[0]);
    } catch (error) {
      console.error('[ChildPatientRegistration.findById] Error:', error);
      throw error;
    }
  }

  // Find child patient by CR number
  static async findByCRNo(cr_number) {
    try {
      if (!cr_number) {
        return null;
      }

      const query = `
        SELECT * FROM child_patient_registrations
        WHERE cr_number = $1
      `;

      const result = await db.query(query, [cr_number]);

      if (result.rows.length === 0) {
        return null;
      }

      return new ChildPatientRegistration(result.rows[0]);
    } catch (error) {
      console.error('[ChildPatientRegistration.findByCRNo] Error:', error);
      throw error;
    }
  }

  // Find all with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const safeLimit = Math.min(limit, 1000);
      const where = [];
      const params = [];
      let idx = 1;

      // Apply filters
      if (filters.assigned_room) {
        where.push(`TRIM(COALESCE(assigned_room::text, '')) = TRIM($${idx}::text)`);
        params.push(filters.assigned_room);
        idx++;
      }
      if (filters.date) {
        // For "Today's Patients" view: Include child patients that were either:
        // 1. Created today (in IST), OR
        // 2. Updated today with an assigned_room (meaning they were added to today's list)
        // This ensures existing child patients added to today's list via "Add to Today's List" appear
        // Use TO_CHAR to compare date strings in IST timezone for accurate comparison
        console.log(`[ChildPatientRegistration.findAll] Filtering by date: ${filters.date}`);
        where.push(`(
          TO_CHAR((cpr.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $${idx}
          OR (
            cpr.assigned_room IS NOT NULL 
            AND TRIM(COALESCE(cpr.assigned_room::text, '')) != ''
            AND TO_CHAR((cpr.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $${idx}
          )
        )`);
        params.push(filters.date);
        idx++;
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const query = `
        SELECT 
          cpr.*,
          u_filled.name as filled_by_name,
          u_filled.role as filled_by_role
        FROM child_patient_registrations cpr
        LEFT JOIN users u_filled ON u_filled.id = cpr.filled_by
        ${whereClause}
        ORDER BY cpr.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;

      const countQuery = `
        SELECT COUNT(*) as cnt FROM child_patient_registrations cpr
        ${whereClause}
      `;

      const queryParams = [...params, safeLimit, offset];
      const countParams = params;

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, countParams)
      ]);

      const registrations = result.rows.map(row => {
        const reg = new ChildPatientRegistration(row);
        // Add filled_by_name and filled_by_role from the join
        if (row.filled_by_name) reg.filled_by_name = row.filled_by_name;
        if (row.filled_by_role) reg.filled_by_role = row.filled_by_role;
        return reg;
      });
      const total = parseInt(countResult.rows[0].cnt, 10);

      return {
        child_patients: registrations.map(r => {
          const json = r.toJSON();
          // Include filled_by_name and filled_by_role in the JSON output
          if (r.filled_by_name) json.filled_by_name = r.filled_by_name;
          if (r.filled_by_role) json.filled_by_role = r.filled_by_role;
          return json;
        }),
        registrations,
        pagination: {
          page,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      };
    } catch (error) {
      console.error('[ChildPatientRegistration.findAll] Error:', error);
      throw error;
    }
  }
}

module.exports = ChildPatientRegistration;
