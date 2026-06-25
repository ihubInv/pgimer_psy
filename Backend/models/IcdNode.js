const db = require('../config/database');

class IcdNode {
  constructor(data) {
    this.id = data.id;
    this.parent_id = data.parent_id;
    this.node_type = data.node_type;
    this.title = data.title;
    this.code = data.code;
    this.block = data.block;
    this.chapter_no = data.chapter_no;
    this.foundation_uri = data.foundation_uri;
    this.is_system = data.is_system !== undefined ? data.is_system : false;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.sort_order = data.sort_order || 0;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      parent_id: this.parent_id,
      node_type: this.node_type,
      title: this.title,
      code: this.code,
      block: this.block,
      chapter_no: this.chapter_no,
      foundation_uri: this.foundation_uri,
      is_system: this.is_system,
      is_active: this.is_active,
      sort_order: this.sort_order,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static label(node) {
    if (!node) return '';
    if (node.code) return `${node.code} - ${node.title}`;
    if (node.block) return `${node.block} - ${node.title}`;
    return node.title;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM icd_nodes WHERE id = $1', [id]);
    return result.rows.length ? new IcdNode(result.rows[0]) : null;
  }

  static async findByFoundationUri(uri) {
    if (!uri) return null;
    const result = await db.query('SELECT * FROM icd_nodes WHERE foundation_uri = $1', [uri]);
    return result.rows.length ? new IcdNode(result.rows[0]) : null;
  }

  static async findByCode(code) {
    if (!code) return null;
    const result = await db.query(
      `SELECT * FROM icd_nodes
       WHERE LOWER(code) = LOWER($1) AND is_active = true
       ORDER BY is_system DESC, id ASC
       LIMIT 1`,
      [String(code).trim()]
    );
    return result.rows.length ? new IcdNode(result.rows[0]) : null;
  }

  static async findChildren(parentId, activeOnly = true) {
    const params = [];
    let query = 'SELECT * FROM icd_nodes WHERE ';
    if (parentId == null) {
      query += 'parent_id IS NULL';
    } else {
      query += 'parent_id = $1';
      params.push(parentId);
    }
    if (activeOnly) query += ' AND is_active = true';
    query += ' ORDER BY LOWER(title) ASC';
    const result = await db.query(query, params);
    return result.rows.map((row) => new IcdNode(row));
  }

  static async search(queryText, limit = 30) {
    const q = String(queryText || '').trim();
    if (q.length < 2) return [];
    const pattern = `%${q}%`;
    const result = await db.query(
      `SELECT * FROM icd_nodes
       WHERE is_active = true
         AND (
           LOWER(code) LIKE LOWER($1)
           OR LOWER(block) LIKE LOWER($1)
           OR LOWER(title) LIKE LOWER($1)
         )
       ORDER BY
         CASE WHEN LOWER(code) LIKE LOWER($2) THEN 0
              WHEN LOWER(code) LIKE LOWER($1) THEN 1
              WHEN LOWER(block) LIKE LOWER($2) THEN 2
              WHEN LOWER(title) LIKE LOWER($2) THEN 3
              ELSE 4 END,
         LOWER(title) ASC
       LIMIT $3`,
      [pattern, `${q}%`, limit]
    );
    return result.rows.map((row) => new IcdNode(row));
  }

  static async getPathToRoot(id) {
    const path = [];
    let current = await IcdNode.findById(id);
    while (current) {
      path.unshift(current);
      if (!current.parent_id) break;
      current = await IcdNode.findById(current.parent_id);
    }
    return path;
  }

  static async getPathForCode(code) {
    const node = await IcdNode.findByCode(code);
    if (!node) return null;
    return IcdNode.getPathToRoot(node.id);
  }

  static async titleExistsUnderParent(parentId, title, excludeId = null) {
    const params = [String(title).trim().toLowerCase()];
    let query = `SELECT id FROM icd_nodes
      WHERE LOWER(title) = $1 AND `;
    if (parentId == null) {
      query += 'parent_id IS NULL';
    } else {
      query += 'parent_id = $2';
      params.push(parentId);
    }
    if (excludeId != null) {
      query += ` AND id <> $${params.length + 1}`;
      params.push(excludeId);
    }
    const result = await db.query(query, params);
    return result.rows.length > 0;
  }

  static async codeExists(code, excludeId = null) {
    if (!code) return false;
    const params = [String(code).trim().toLowerCase()];
    let query = 'SELECT id FROM icd_nodes WHERE LOWER(code) = $1';
    if (excludeId != null) {
      query += ' AND id <> $2';
      params.push(excludeId);
    }
    const result = await db.query(query, params);
    return result.rows.length > 0;
  }

  static defaultChildType(parentNode) {
    if (!parentNode) return 'chapter';
    if (parentNode.node_type === 'chapter') return 'category';
    if (parentNode.node_type === 'category') return 'subcategory';
    return 'code';
  }

  static async create(data) {
    const {
      parent_id = null,
      node_type,
      title,
      code = null,
      block = null,
      chapter_no = null,
      foundation_uri = null,
      is_system = false,
      sort_order = 0,
      created_by = null,
    } = data;

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) throw new Error('Title is required');
    if (!node_type) throw new Error('Node type is required');

    if (node_type === 'chapter' && parent_id != null) {
      throw new Error('Chapters cannot have a parent');
    }
    if (node_type !== 'chapter' && parent_id == null) {
      throw new Error('Parent is required for non-chapter nodes');
    }

    if (node_type === 'code' && !code) {
      throw new Error('Code is required for code nodes');
    }

    if (await IcdNode.titleExistsUnderParent(parent_id, trimmedTitle)) {
      throw new Error('A node with this title already exists at this level');
    }

    if (code && (await IcdNode.codeExists(code))) {
      throw new Error('This ICD code already exists');
    }

    const result = await db.query(
      `INSERT INTO icd_nodes (
        parent_id, node_type, title, code, block, chapter_no, foundation_uri,
        is_system, is_active, sort_order, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        parent_id,
        node_type,
        trimmedTitle,
        code ? String(code).trim() : null,
        block ? String(block).trim() : null,
        chapter_no ? String(chapter_no).trim() : null,
        foundation_uri,
        is_system,
        sort_order,
        created_by,
      ]
    );
    return new IcdNode(result.rows[0]);
  }

  async update(data) {
    if (this.is_system) {
      throw new Error('System ICD nodes cannot be modified');
    }

    const { title, code, block, node_type, is_active } = data;
    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) {
      const trimmedTitle = String(title).trim();
      if (!trimmedTitle) throw new Error('Title is required');
      if (await IcdNode.titleExistsUnderParent(this.parent_id, trimmedTitle, this.id)) {
        throw new Error('A node with this title already exists at this level');
      }
      updates.push(`title = $${idx++}`);
      params.push(trimmedTitle);
    }

    if (code !== undefined) {
      const trimmedCode = code ? String(code).trim() : null;
      if (trimmedCode && (await IcdNode.codeExists(trimmedCode, this.id))) {
        throw new Error('This ICD code already exists');
      }
      updates.push(`code = $${idx++}`);
      params.push(trimmedCode);
    }

    if (block !== undefined) {
      updates.push(`block = $${idx++}`);
      params.push(block ? String(block).trim() : null);
    }

    if (node_type !== undefined) {
      updates.push(`node_type = $${idx++}`);
      params.push(node_type);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(is_active);
    }

    if (!updates.length) return this;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(this.id);

    const result = await db.query(
      `UPDATE icd_nodes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    Object.assign(this, new IcdNode(result.rows[0]));
    return this;
  }

  async delete() {
    if (this.is_system) {
      throw new Error('System ICD nodes cannot be deleted');
    }
    await db.query('DELETE FROM icd_nodes WHERE id = $1', [this.id]);
    return true;
  }
}

module.exports = IcdNode;
