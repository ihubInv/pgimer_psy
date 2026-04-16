// controllers/childClinicalProformaController.js
const ChildClinicalProforma = require('../models/ChildClinicalProforma');
const ChildPatientRegistration = require('../models/ChildPatientRegistration');

class ChildClinicalProformaController {
  // Create a new child clinical proforma
  static async createChildClinicalProforma(req, res) {
    try {
      const data = req.body;

      // Debug: Log incoming data types to verify no coercion
      console.log('[childClinicalProformaController] Incoming request data types:', {
        // New fields
        'presenting_complaints': data.presenting_complaints,
        'neurodevelopmental_concerns (type)': Array.isArray(data.neurodevelopmental_concerns) ? 'array' : typeof data.neurodevelopmental_concerns,
        'behavioral_concerns (type)': Array.isArray(data.behavioral_concerns) ? 'array' : typeof data.behavioral_concerns,
        'emotional_psychological_symptoms (type)': Array.isArray(data.emotional_psychological_symptoms) ? 'array' : typeof data.emotional_psychological_symptoms,
        'risk_assessment (type)': Array.isArray(data.risk_assessment) ? 'array' : typeof data.risk_assessment,
        'investigations_required (type)': Array.isArray(data.investigations_required) ? 'array' : typeof data.investigations_required,
        'provisional_diagnosis': data.provisional_diagnosis,
        'follow_up_after': data.follow_up_after,
        'referred_to': data.referred_to,
        // Legacy fields
        'family_history (type)': Array.isArray(data.family_history) ? 'array' : typeof data.family_history,
        'family_history (value)': data.family_history,
        'disposal_status': data.disposal_status,
      });

      // Basic validation
      if (!data.child_patient_id) {
        return res.status(400).json({
          success: false,
          message: 'Child patient ID is required'
        });
      }

      // Check if child patient exists
      const childPatient = await ChildPatientRegistration.findById(data.child_patient_id);
      if (!childPatient) {
        return res.status(404).json({
          success: false,
          message: 'Child patient not found'
        });
      }

      // Auto-fill from child patient registration
      const proformaData = {
        ...data,
        filled_by: req.user.id,
        child_name: data.child_name || childPatient.child_name,
        sex: data.sex || childPatient.sex,
        // Extract age from age_group if age not provided
        age: data.age || (childPatient.age_group ? this.extractAgeFromGroup(childPatient.age_group) : null),
        visit_date: data.visit_date || new Date().toISOString().split('T')[0],
        date: data.date || new Date().toISOString().split('T')[0],
        room_no: data.room_no || childPatient.assigned_room,
        assigned_doctor: data.assigned_doctor || req.user.id,
        status: data.status || 'draft'
      };

      const proforma = await ChildClinicalProforma.create(proformaData);

      res.status(201).json({
        success: true,
        message: 'Child clinical proforma created successfully',
        data: { proforma: proforma.toJSON() }
      });
    } catch (error) {
      console.error('[childClinicalProformaController.createChildClinicalProforma] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create child clinical proforma',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Helper to extract approximate age from age group
  static extractAgeFromGroup(ageGroup) {
    if (!ageGroup) return null;
    const ageMap = {
      'Less than 1 year': 0,
      '1 – 5 years': 3,
      '5 – 10 years': 7,
      '10 – 15 years': 12
    };
    return ageMap[ageGroup] || null;
  }

  // Get child clinical proforma by ID
  static async getChildClinicalProformaById(req, res) {
    try {
      const { id } = req.params;

      const proforma = await ChildClinicalProforma.findById(id);

      if (!proforma) {
        return res.status(404).json({
          success: false,
          message: 'Child clinical proforma not found'
        });
      }

      res.json({
        success: true,
        data: { proforma: proforma.toJSON() }
      });
    } catch (error) {
      console.error('[childClinicalProformaController.getChildClinicalProformaById] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch child clinical proforma',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all child clinical proformas by child patient ID
  static async getChildClinicalProformasByChildPatientId(req, res) {
    try {
      const { child_patient_id } = req.params;

      const proformas = await ChildClinicalProforma.findByChildPatientId(child_patient_id);

      res.json({
        success: true,
        data: { proformas: proformas.map(p => p.toJSON()) }
      });
    } catch (error) {
      console.error('[childClinicalProformaController.getChildClinicalProformasByChildPatientId] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch child clinical proformas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all child clinical proformas with pagination
  static async getAllChildClinicalProformas(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};

      if (req.query.child_patient_id) {
        filters.child_patient_id = parseInt(req.query.child_patient_id);
      }
      if (req.query.filled_by) {
        filters.filled_by = parseInt(req.query.filled_by);
      }
      if (req.query.visit_date) {
        filters.visit_date = req.query.visit_date;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await ChildClinicalProforma.findAll(page, limit, filters);

      res.json({
        success: true,
        data: {
          proformas: result.proformas.map(p => p.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('[childClinicalProformaController.getAllChildClinicalProformas] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch child clinical proformas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update child clinical proforma
  static async updateChildClinicalProforma(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const proforma = await ChildClinicalProforma.findById(id);

      if (!proforma) {
        return res.status(404).json({
          success: false,
          message: 'Child clinical proforma not found'
        });
      }

      // Validate conditional fields
      if (updateData.has_physical_illness === true && !updateData.physical_illness_specification) {
        return res.status(400).json({
          success: false,
          message: 'Physical illness specification is required when physical illness is present'
        });
      }

      if (updateData.disposal_status === 'Managed in Walk-in only' && !updateData.disposal_reason) {
        return res.status(400).json({
          success: false,
          message: 'Disposal reason is required when status is "Managed in Walk-in only"'
        });
      }

      await proforma.update(updateData);

      res.json({
        success: true,
        message: 'Child clinical proforma updated successfully',
        data: { proforma: proforma.toJSON() }
      });
    } catch (error) {
      console.error('[childClinicalProformaController.updateChildClinicalProforma] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update child clinical proforma',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete child clinical proforma
  static async deleteChildClinicalProforma(req, res) {
    try {
      const { id } = req.params;

      const proforma = await ChildClinicalProforma.findById(id);

      if (!proforma) {
        return res.status(404).json({
          success: false,
          message: 'Child clinical proforma not found'
        });
      }

      await proforma.delete();

      res.json({
        success: true,
        message: 'Child clinical proforma deleted successfully'
      });
    } catch (error) {
      console.error('[childClinicalProformaController.deleteChildClinicalProforma] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete child clinical proforma',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ChildClinicalProformaController;
