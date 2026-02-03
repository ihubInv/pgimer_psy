const FollowUp = require('../models/FollowUp');
const PatientVisit = require('../models/PatientVisit');
const db = require('../config/database');
const { validationResult } = require('express-validator');

class FollowUpController {
  // Create a new follow-up visit
  static async createFollowUp(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        patient_id,
        child_patient_id,
        visit_date,
        clinical_assessment,
        assigned_doctor_id,
        room_no,
      } = req.body;

      // Validate required fields - either patient_id or child_patient_id must be provided
      if (!patient_id && !child_patient_id) {
        return res.status(400).json({
          success: false,
          message: 'Either patient_id or child_patient_id is required',
        });
      }

      if (!clinical_assessment || !clinical_assessment.trim()) {
        return res.status(400).json({
          success: false,
          message: 'clinical_assessment is required',
        });
      }

      // Use today's date if visit_date not provided
      const dateToUse = visit_date || new Date().toISOString().split('T')[0];

      // Check if visit record exists for this patient and date, create if not (only for adult patients)
      let visitId = null;
      if (patient_id) {
      try {
        const visitCheck = await db.query(
          `SELECT id FROM patient_visits 
           WHERE patient_id = $1 AND visit_date = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [patient_id, dateToUse]
        );

        if (visitCheck.rows.length > 0) {
          visitId = visitCheck.rows[0].id;
        } else {
          // Create visit record
          const visitCount = await PatientVisit.getVisitCount(patient_id);
          const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

          const visit = await PatientVisit.assignPatient({
            patient_id: parseInt(patient_id, 10),
            visit_date: dateToUse,
            visit_type: visitType,
            assigned_doctor_id: assigned_doctor_id ? parseInt(assigned_doctor_id, 10) : null,
            room_no: room_no || null,
            notes: 'Follow-up visit created',
          });

          visitId = visit.id;
        }
      } catch (visitError) {
        console.error('[createFollowUp] Error creating/checking visit:', visitError);
        // Continue even if visit creation fails
        }
      }

      // Create follow-up record
      const followUp = await FollowUp.create({
        patient_id: patient_id ? parseInt(patient_id, 10) : null,
        child_patient_id: child_patient_id ? parseInt(child_patient_id, 10) : null,
        visit_id: visitId,
        visit_date: dateToUse,
        clinical_assessment: clinical_assessment.trim(),
        filled_by: req.user.id,
        assigned_doctor_id: assigned_doctor_id ? parseInt(assigned_doctor_id, 10) : null,
        room_no: room_no || null,
      });

      // Update visit record with follow-up reference if visit was created
      if (visitId) {
        try {
          await db.query(
            `UPDATE patient_visits 
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [visitId]
          );
        } catch (updateError) {
          console.error('[createFollowUp] Error updating visit:', updateError);
          // Don't fail if this update fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Follow-up visit created successfully',
        data: {
          followup: followUp.toJSON(),
        },
      });
    } catch (error) {
      console.error('Create follow-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create follow-up visit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Get follow-up by ID
  static async getFollowUpById(req, res) {
    try {
      const { id } = req.params;

      const followUp = await FollowUp.findById(id);

      if (!followUp) {
        return res.status(404).json({
          success: false,
          message: 'Follow-up visit not found',
        });
      }

      res.json({
        success: true,
        data: {
          followup: followUp.toJSON(),
        },
      });
    } catch (error) {
      console.error('Get follow-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get follow-up visit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Get all follow-ups for a patient
  static async getFollowUpsByPatientId(req, res) {
    try {
      const { patient_id } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await FollowUp.findByPatientId(patient_id, page, limit);

      res.json({
        success: true,
        data: {
          followups: result.followups.map(f => f.toJSON()),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: result.pages,
          },
        },
      });
    } catch (error) {
      console.error('Get follow-ups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get follow-up visits',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Get all follow-ups for a child patient
  static async getFollowUpsByChildPatientId(req, res) {
    try {
      const { child_patient_id } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await FollowUp.findByChildPatientId(child_patient_id, page, limit);

      res.json({
        success: true,
        data: {
          followups: result.followups.map(f => f.toJSON()),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: result.pages,
          },
        },
      });
    } catch (error) {
      console.error('Get child follow-ups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get child follow-up visits',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Update follow-up visit
  static async updateFollowUp(req, res) {
    try {
      const { id } = req.params;
      const {
        visit_date,
        clinical_assessment,
        assigned_doctor_id,
        room_no,
      } = req.body;

      const updateData = {};
      if (visit_date !== undefined) updateData.visit_date = visit_date;
      if (clinical_assessment !== undefined) updateData.clinical_assessment = clinical_assessment;
      if (assigned_doctor_id !== undefined) updateData.assigned_doctor_id = assigned_doctor_id;
      if (room_no !== undefined) updateData.room_no = room_no;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update',
        });
      }

      const updatedFollowUp = await FollowUp.update(id, updateData);

      if (!updatedFollowUp) {
        return res.status(404).json({
          success: false,
          message: 'Follow-up visit not found',
        });
      }

      res.json({
        success: true,
        message: 'Follow-up visit updated successfully',
        data: {
          followup: updatedFollowUp.toJSON(),
        },
      });
    } catch (error) {
      console.error('Update follow-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update follow-up visit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  // Delete follow-up visit (soft delete)
  static async deleteFollowUp(req, res) {
    try {
      const { id } = req.params;

      const deletedFollowUp = await FollowUp.delete(id);

      if (!deletedFollowUp) {
        return res.status(404).json({
          success: false,
          message: 'Follow-up visit not found',
        });
      }

      res.json({
        success: true,
        message: 'Follow-up visit deleted successfully',
      });
    } catch (error) {
      console.error('Delete follow-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete follow-up visit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
}

module.exports = FollowUpController;

