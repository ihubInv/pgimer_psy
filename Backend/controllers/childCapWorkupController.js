const ChildCapWorkup = require('../models/ChildCapWorkup');

class ChildCapWorkupController {
  // GET /api/child-cap-workup/child-patient/:child_patient_id
  static async getByChildPatientId(req, res) {
    try {
      const { child_patient_id } = req.params;
      const records = await ChildCapWorkup.findByChildPatientId(child_patient_id);
      res.json({ success: true, data: { records: records.map(r => r.toJSON()) } });
    } catch (error) {
      console.error('[ChildCapWorkup] getByChildPatientId error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch workup records', error: error.message });
    }
  }

  // GET /api/child-cap-workup/:id
  static async getById(req, res) {
    try {
      const record = await ChildCapWorkup.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Workup record not found' });
      res.json({ success: true, data: { record: record.toJSON() } });
    } catch (error) {
      console.error('[ChildCapWorkup] getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch workup record', error: error.message });
    }
  }

  // POST /api/child-cap-workup
  static async create(req, res) {
    try {
      const { child_patient_id, ...rest } = req.body;
      if (!child_patient_id) {
        return res.status(400).json({ success: false, message: 'child_patient_id is required' });
      }
      const record = await ChildCapWorkup.create({ child_patient_id, ...rest });
      res.status(201).json({ success: true, message: 'Workup record created', data: { record: record.toJSON() } });
    } catch (error) {
      console.error('[ChildCapWorkup] create error:', error);
      res.status(500).json({ success: false, message: 'Failed to create workup record', error: error.message });
    }
  }

  // PUT /api/child-cap-workup/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await ChildCapWorkup.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Workup record not found' });

      const updated = await ChildCapWorkup.update(id, req.body);
      res.json({ success: true, message: 'Workup record updated', data: { record: updated.toJSON() } });
    } catch (error) {
      console.error('[ChildCapWorkup] update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update workup record', error: error.message });
    }
  }

  // DELETE /api/child-cap-workup/:id  (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ChildCapWorkup.delete(id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Workup record not found' });
      res.json({ success: true, message: 'Workup record deleted' });
    } catch (error) {
      console.error('[ChildCapWorkup] delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete workup record', error: error.message });
    }
  }
}

module.exports = ChildCapWorkupController;
