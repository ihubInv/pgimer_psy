const db = require('../config/database');

const PrescriptionTemplate = {
  // Create a new prescription template
  create: async (templateData) => {
    const { name, description, created_by, prescription, is_active = true } = templateData;
    
    const query = `
      INSERT INTO prescription_templates (name, description, created_by, prescription, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [name, description, created_by, JSON.stringify(prescription), is_active];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Find template by ID
  findById: async (id) => {
    const query = 'SELECT * FROM prescription_templates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all templates (optionally filter by user)
  findAll: async (filters = {}) => {
    let query = 'SELECT pt.*, u.name as creator_name, u.role as creator_role FROM prescription_templates pt LEFT JOIN users u ON pt.created_by = u.id WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.created_by) {
      paramCount++;
      query += ` AND pt.created_by = $${paramCount}`;
      values.push(filters.created_by);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND pt.is_active = $${paramCount}`;
      values.push(filters.is_active);
    }

    query += ' ORDER BY pt.created_at DESC';
    
    const result = await db.query(query, values);
    return result.rows;
  },

  // Update template
  update: async (id, templateData) => {
    const { name, description, prescription, is_active } = templateData;
    
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (prescription !== undefined) {
      paramCount++;
      updates.push(`prescription = $${paramCount}`);
      values.push(JSON.stringify(prescription));
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return await PrescriptionTemplate.findById(id);
    }

    paramCount++;
    values.push(id);
    
    const query = `
      UPDATE prescription_templates
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Delete template
  delete: async (id) => {
    const query = 'DELETE FROM prescription_templates WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Check if template belongs to user
  belongsToUser: async (id, userId) => {
    const query = 'SELECT created_by FROM prescription_templates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0]?.created_by === userId;
  }
};

module.exports = PrescriptionTemplate;

