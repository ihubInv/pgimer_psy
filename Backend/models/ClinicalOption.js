const db = require('../config/database');

class ClinicalOption {
  constructor(data) {
    this.id = data.id;
    this.option_group = data.option_group;
    this.option_label = data.option_label;
    this.display_order = data.display_order || 0;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.is_system = data.is_system !== undefined ? data.is_system : false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      option_group: this.option_group,
      option_label: this.option_label,
      display_order: this.display_order,
      is_active: this.is_active,
      is_system: this.is_system,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Find all options for a specific group
  static async findByGroup(group, activeOnly = true) {
    try {
      let query = 'SELECT * FROM clinical_options WHERE option_group = $1';
      const params = [group];
      
      if (activeOnly) {
        query += ' AND is_active = true';
      }
      
      query += ' ORDER BY display_order ASC, option_label ASC';
      
      const result = await db.query(query, params);
      return result.rows.map(row => new ClinicalOption(row));
    } catch (error) {
      throw error;
    }
  }

  // Find all groups with their options
  static async findAllGroups(activeOnly = true) {
    try {
      let query = 'SELECT * FROM clinical_options';
      const params = [];
      
      if (activeOnly) {
        query += ' WHERE is_active = true';
      }
      
      query += ' ORDER BY option_group ASC, display_order ASC, option_label ASC';
      
      const result = await db.query(query, params);
      
      // Group by option_group - return just labels for backward compatibility
      const grouped = {};
      result.rows.forEach(row => {
        const option = new ClinicalOption(row);
        if (!grouped[option.option_group]) {
          grouped[option.option_group] = [];
        }
        grouped[option.option_group].push(option.option_label);
      });
      
      return grouped;
    } catch (error) {
      throw error;
    }
  }

  // Find option by ID
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM clinical_options WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ClinicalOption(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find option by group and label
  static async findByGroupAndLabel(group, label) {
    try {
      const result = await db.query(
        'SELECT * FROM clinical_options WHERE option_group = $1 AND option_label = $2',
        [group, label]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ClinicalOption(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Create a new option
  static async create(data) {
    try {
      const { option_group, option_label, display_order = 0, is_system = false } = data;
      
      // Check if option already exists
      const existing = await ClinicalOption.findByGroupAndLabel(option_group, option_label);
      if (existing) {
        throw new Error('Option already exists in this group');
      }

      // Get max display_order for this group
      const maxOrderResult = await db.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM clinical_options WHERE option_group = $1',
        [option_group]
      );
      const maxOrder = parseInt(maxOrderResult.rows[0].max_order, 10);
      const finalDisplayOrder = display_order || maxOrder + 1;

      const result = await db.query(
        `INSERT INTO clinical_options (option_group, option_label, display_order, is_active, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, true, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [option_group, option_label, finalDisplayOrder, is_system]
      );

      return new ClinicalOption(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update an option
  async update(data) {
    try {
      const { option_label, display_order, is_active } = data;
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (option_label !== undefined) {
        // Check if new label conflicts with existing option in same group
        const existing = await ClinicalOption.findByGroupAndLabel(this.option_group, option_label);
        if (existing && existing.id !== this.id) {
          throw new Error('Option label already exists in this group');
        }
        updates.push(`option_label = $${paramIndex++}`);
        params.push(option_label);
      }

      if (display_order !== undefined) {
        updates.push(`display_order = $${paramIndex++}`);
        params.push(display_order);
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(is_active);
      }

      if (updates.length === 0) {
        return this;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(this.id);

      const result = await db.query(
        `UPDATE clinical_options 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Option not found');
      }

      // Update instance properties
      Object.assign(this, new ClinicalOption(result.rows[0]));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete (permanently remove from database)
  // System options cannot be deleted
  async hardDelete() {
    try {
      // Prevent deletion of system options
      if (this.is_system) {
        throw new Error('Cannot delete system option. System options are protected and cannot be removed.');
      }

      const result = await db.query(
        'DELETE FROM clinical_options WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Option not found');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete (soft delete) - also prevents deletion of system options
  async delete() {
    try {
      // Prevent deletion of system options
      if (this.is_system) {
        throw new Error('Cannot delete system option. System options are protected and cannot be removed.');
      }

      const result = await db.query(
        `UPDATE clinical_options 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Option not found');
      }

      this.is_active = false;
      return this;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ClinicalOption;

