const db = require('../config/database');

class Medicine {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create a new medicine
   */
  static async create(medicineData) {
    try {
      const { name, category, is_active = true } = medicineData;

      if (!name || !category) {
        throw new Error('Name and category are required');
      }

      const query = `
        INSERT INTO medicines (name, category, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `;

      const result = await db.query(query, [name.trim(), category, is_active]);
      return new Medicine(result.rows[0]);
    } catch (error) {
      console.error('[Medicine.create] Error:', error);
      throw error;
    }
  }

  /**
   * Find medicine by ID
   */
  static async findById(id) {
    try {
      const query = `
        SELECT * FROM medicines
        WHERE id = $1
      `;
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Medicine(result.rows[0]);
    } catch (error) {
      console.error('[Medicine.findById] Error:', error);
      throw error;
    }
  }

  /**
   * Find medicine by name (case-insensitive)
   */
  static async findByName(name) {
    try {
      const query = `
        SELECT * FROM medicines
        WHERE LOWER(name) = LOWER($1)
      `;
      const result = await db.query(query, [name.trim()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Medicine(result.rows[0]);
    } catch (error) {
      console.error('[Medicine.findByName] Error:', error);
      throw error;
    }
  }

  /**
   * Get all medicines with pagination and filters
   */
  static async findAll(page = 1, limit = 50, filters = {}) {
    try {
      const { category, search, is_active } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Filter by category
      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      // Filter by active status
      if (is_active !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }

      // Search by name
      if (search) {
        whereConditions.push(`LOWER(name) LIKE $${paramIndex}`);
        queryParams.push(`%${search.toLowerCase()}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM medicines ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated results
      const query = `
        SELECT * FROM medicines
        ${whereClause}
        ORDER BY category, name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);
      const medicines = result.rows.map(row => new Medicine(row));

      return {
        medicines,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[Medicine.findAll] Error:', error);
      throw error;
    }
  }

  /**
   * Get medicines by category
   */
  static async findByCategory(category) {
    try {
      const query = `
        SELECT * FROM medicines
        WHERE category = $1 AND is_active = true
        ORDER BY name ASC
      `;
      const result = await db.query(query, [category]);
      return result.rows.map(row => new Medicine(row));
    } catch (error) {
      console.error('[Medicine.findByCategory] Error:', error);
      throw error;
    }
  }

  /**
   * Update medicine
   */
  async update(updateData) {
    try {
      const { name, category, is_active } = updateData;
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(name.trim());
        paramIndex++;
      }

      if (category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return this;
      }

      updates.push(`updated_at = NOW()`);
      values.push(this.id);

      const query = `
        UPDATE medicines
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);
      return new Medicine(result.rows[0]);
    } catch (error) {
      console.error('[Medicine.update] Error:', error);
      throw error;
    }
  }

  /**
   * Delete medicine (soft delete by setting is_active to false)
   */
  async delete() {
    try {
      const query = `
        UPDATE medicines
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(query, [this.id]);
      return new Medicine(result.rows[0]);
    } catch (error) {
      console.error('[Medicine.delete] Error:', error);
      throw error;
    }
  }

  /**
   * Hard delete medicine (permanent removal)
   */
  async hardDelete() {
    try {
      const query = `DELETE FROM medicines WHERE id = $1`;
      await db.query(query, [this.id]);
      return true;
    } catch (error) {
      console.error('[Medicine.hardDelete] Error:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT category
        FROM medicines
        WHERE is_active = true
        ORDER BY category ASC
      `;
      const result = await db.query(query);
      return result.rows.map(row => row.category);
    } catch (error) {
      console.error('[Medicine.getCategories] Error:', error);
      throw error;
    }
  }

  /**
   * Bulk create medicines from JSON data
   */
  static async bulkCreate(medicinesData) {
    try {
      const medicines = [];
      const errors = [];

      for (const [category, medicineNames] of Object.entries(medicinesData)) {
        for (const name of medicineNames) {
          try {
            // Check if medicine already exists
            const existing = await Medicine.findByName(name);
            if (existing) {
              errors.push({ name, category, error: 'Already exists' });
              continue;
            }

            const medicine = await Medicine.create({ name, category });
            medicines.push(medicine);
          } catch (error) {
            errors.push({ name, category, error: error.message });
          }
        }
      }

      return { medicines, errors };
    } catch (error) {
      console.error('[Medicine.bulkCreate] Error:', error);
      throw error;
    }
  }
}

module.exports = Medicine;

