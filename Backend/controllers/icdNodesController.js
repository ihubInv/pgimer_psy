const IcdNode = require('../models/IcdNode');
const seedIcdNodes = require('../scripts/seedIcdNodes');

class IcdNodesController {
  static async getChildren(req, res) {
    try {
      const parentId = req.query.parent_id;
      const parsedParent =
        parentId === undefined || parentId === '' || parentId === 'root' || parentId === 'null'
          ? null
          : parseInt(parentId, 10);

      if (parsedParent !== null && Number.isNaN(parsedParent)) {
        return res.status(400).json({ success: false, message: 'Invalid parent_id' });
      }

      const nodes = await IcdNode.findChildren(parsedParent, true);
      return res.json({
        success: true,
        data: {
          parent_id: parsedParent,
          nodes: nodes.map((n) => n.toJSON()),
        },
      });
    } catch (error) {
      console.error('Get ICD children error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get ICD nodes' });
    }
  }

  static async search(req, res) {
    try {
      const q = req.query.q || '';
      const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
      const nodes = await IcdNode.search(q, limit);
      return res.json({
        success: true,
        data: { nodes: nodes.map((n) => n.toJSON()) },
      });
    } catch (error) {
      console.error('Search ICD nodes error:', error);
      return res.status(500).json({ success: false, message: 'Failed to search ICD nodes' });
    }
  }

  static async getPathByCode(req, res) {
    try {
      const code = req.params.code;
      const path = await IcdNode.getPathForCode(code);
      if (!path) {
        return res.json({
          success: true,
          data: { code, path: [], node: null },
        });
      }
      return res.json({
        success: true,
        data: {
          code,
          path: path.map((n) => n.toJSON()),
          node: path[path.length - 1].toJSON(),
        },
      });
    } catch (error) {
      console.error('Get ICD path error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get ICD path' });
    }
  }

  static async getPathById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const path = await IcdNode.getPathToRoot(id);
      if (!path.length) {
        return res.status(404).json({ success: false, message: 'Node not found' });
      }
      return res.json({
        success: true,
        data: {
          path: path.map((n) => n.toJSON()),
          node: path[path.length - 1].toJSON(),
        },
      });
    } catch (error) {
      console.error('Get ICD path by id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get ICD path' });
    }
  }

  static async createNode(req, res) {
    try {
      const { parent_id, node_type, title, code, block, chapter_no } = req.body;
      const parsedParent =
        parent_id === undefined || parent_id === null || parent_id === ''
          ? null
          : parseInt(parent_id, 10);

      if (parsedParent !== null && Number.isNaN(parsedParent)) {
        return res.status(400).json({ success: false, message: 'Invalid parent_id' });
      }

      if (parsedParent != null) {
        const parent = await IcdNode.findById(parsedParent);
        if (!parent) {
          return res.status(404).json({ success: false, message: 'Parent node not found' });
        }
      }

      const node = await IcdNode.create({
        parent_id: parsedParent,
        node_type,
        title,
        code,
        block,
        chapter_no,
        is_system: false,
        created_by: req.user?.id || null,
      });

      return res.status(201).json({
        success: true,
        message: 'ICD node created',
        data: { node: node.toJSON() },
      });
    } catch (error) {
      console.error('Create ICD node error:', error);
      if (
        error.message.includes('already exists') ||
        error.message.includes('required') ||
        error.message.includes('cannot')
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: 'Failed to create ICD node' });
    }
  }

  static async updateNode(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const node = await IcdNode.findById(id);
      if (!node) {
        return res.status(404).json({ success: false, message: 'Node not found' });
      }

      await node.update(req.body);
      return res.json({
        success: true,
        message: 'ICD node updated',
        data: { node: node.toJSON() },
      });
    } catch (error) {
      console.error('Update ICD node error:', error);
      if (error.message.includes('cannot') || error.message.includes('already exists')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: 'Failed to update ICD node' });
    }
  }

  static async deleteNode(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const node = await IcdNode.findById(id);
      if (!node) {
        return res.status(404).json({ success: false, message: 'Node not found' });
      }

      await node.delete();
      return res.json({ success: true, message: 'ICD node deleted' });
    } catch (error) {
      console.error('Delete ICD node error:', error);
      if (error.message.includes('cannot')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: 'Failed to delete ICD node' });
    }
  }

  static async seed(req, res) {
    try {
      const result = await seedIcdNodes();
      return res.json({
        success: true,
        message: 'ICD nodes seeded',
        data: result,
      });
    } catch (error) {
      console.error('Seed ICD nodes error:', error);
      return res.status(500).json({ success: false, message: 'Failed to seed ICD nodes' });
    }
  }
}

module.exports = IcdNodesController;
