// controllers/childPatientController.js
const ChildPatientRegistration = require('../models/ChildPatientRegistration');
const path = require('path');
const fs = require('fs').promises;
const uploadConfig = require('../config/uploadConfig');

/** Rewrite URL paths after folder rename: .../Child_Patient_Registration/{tempId}/... → .../{numericId}/... */
function rewriteChildRegistrationPaths(url, tempFolderId, numericId) {
  if (!url || typeof url !== 'string') return url;
  const from = `/${tempFolderId}/`;
  const to = `/${numericId}/`;
  if (!url.includes(from)) return url;
  return url.split(from).join(to);
}

class ChildPatientController {
  // Register new child patient
  static async registerChildPatient(req, res) {
    try {
      console.log('[childPatientController.registerChildPatient] Received request');
      
      const childPatientData = {
        ...req.body,
        filled_by: req.user.id
      };

      // Validate required fields
      if (!childPatientData.child_name || childPatientData.child_name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Child name is required'
        });
      }

      // Validate mobile number if provided
      if (childPatientData.mobile_no) {
        const mobileNo = String(childPatientData.mobile_no).trim();
        // Must be exactly 10 digits, numeric only
        if (!/^\d{10}$/.test(mobileNo)) {
          return res.status(400).json({
            success: false,
            message: 'Mobile number must be exactly 10 digits (numeric only)'
          });
        }
        childPatientData.mobile_no = mobileNo;
      }

      // Validate age if provided
      if (childPatientData.age !== undefined && childPatientData.age !== null && childPatientData.age !== '') {
        const age = parseInt(childPatientData.age, 10);
        if (isNaN(age) || age < 0 || age > 18) {
          return res.status(400).json({
            success: false,
            message: 'Age must be a valid number between 0 and 18'
          });
        }
        childPatientData.age = age;
      }

      // Handle file uploads (documents and photo)
      const uploadedDocuments = [];
      let childId = null; // Track temp folder name for later rename

      // Process uploaded files
      // Note: after handleUpload middleware, req.files is a flat array of file objects
      if (req.files && req.files.length > 0) {
        childId = `child_${Date.now()}`; // Temporary ID for folder structure
        const role = uploadConfig.mapRoleToFolder(req.user?.role);
        const uploadDir = path.join(
          uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH),
          role,
          'Child_Patient_Registration',
          childId
        );

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Process all uploaded files (req.files is a flat array after handleUpload normalization)
        for (const file of req.files) {
          const isPhoto = file.fieldname === 'photo' || file.originalname.match(/^photo_/i);
            const fileName = `${Date.now()}_${file.originalname}`;
          const destPath = path.join(uploadDir, fileName);

          // Copy file from multer's temp location to the target directory
          await fs.copyFile(file.path, destPath);
            
          const urlPath = uploadConfig.getUrlPath(destPath);

          if (isPhoto && !childPatientData.photo_path) {
            childPatientData.photo_path = urlPath;
          } else {
            uploadedDocuments.push(urlPath);
          }
        }
      }

      // Add documents array to data
      if (uploadedDocuments.length > 0) {
        childPatientData.documents = uploadedDocuments;
      }

      // Create child patient registration
      let childPatient = await ChildPatientRegistration.create(childPatientData);

      // Rename temp folder to actual patient ID now that we have it
      if (childId && childPatient.id) {
        const role = uploadConfig.mapRoleToFolder(req.user?.role);
        const oldDir = path.join(
          uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH),
          role,
          'Child_Patient_Registration',
          childId
        );
        const newDir = path.join(
          uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH),
          role,
          'Child_Patient_Registration',
          String(childPatient.id)
        );
        
        let renamedToNumericFolder = false;
        try {
          await fs.rename(oldDir, newDir);
          renamedToNumericFolder = true;
        } catch (renameErr) {
          console.warn('[childPatientController] Could not rename directory:', renameErr.message);
        }
        // Only rewrite DB paths when rename succeeded (URLs then pointed at temp folder name)
        if (renamedToNumericFolder) {
          try {
            let docs = childPatient.documents;
            if (typeof docs === 'string') {
              try {
                docs = JSON.parse(docs);
              } catch {
                docs = [];
              }
            }
            if (!Array.isArray(docs)) docs = [];
            const newDocs = docs.map((u) => rewriteChildRegistrationPaths(u, childId, childPatient.id));
            const newPhoto = childPatient.photo_path
              ? rewriteChildRegistrationPaths(childPatient.photo_path, childId, childPatient.id)
              : null;
            const updated = await ChildPatientRegistration.updateDocumentsAndPhoto(
              childPatient.id,
              newDocs,
              newPhoto
            );
            if (updated) {
              childPatient = updated;
            }
          } catch (pathErr) {
            console.error('[childPatientController] Failed to update paths after child folder rename:', pathErr);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: 'Child patient registered successfully',
        data: { childPatient: childPatient.toJSON() }
      });
    } catch (error) {
      console.error('[childPatientController.registerChildPatient] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register child patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all child patients with pagination
  static async getAllChildPatients(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await ChildPatientRegistration.findAll(page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[childPatientController.getAllChildPatients] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get child patients',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get child patient by ID
  static async getChildPatientById(req, res) {
    try {
      const { id } = req.params;

      console.log(`[getChildPatientById] Fetching child patient with ID: ${id}`);

      const childPatient = await ChildPatientRegistration.findById(id);

      if (!childPatient) {
        console.log(`[getChildPatientById] Child patient with ID ${id} not found`);
        return res.status(404).json({
          success: false,
          message: `Child patient with ID ${id} not found`
        });
      }

      console.log(`[getChildPatientById] Successfully fetched child patient ID: ${childPatient.id}, Name: ${childPatient.child_name}`);
      res.json({
        success: true,
        data: { childPatient: childPatient.toJSON() }
      });
    } catch (error) {
      console.error('[childPatientController.getChildPatientById] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get child patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get child patient by CR number
  static async getChildPatientByCRNo(req, res) {
    try {
      const { cr_number } = req.params;

      console.log(`[getChildPatientByCRNo] Fetching child patient with CR number: ${cr_number}`);

      const childPatient = await ChildPatientRegistration.findByCRNo(cr_number);

      if (!childPatient) {
        console.log(`[getChildPatientByCRNo] Child patient with CR number ${cr_number} not found`);
        return res.status(404).json({
          success: false,
          message: 'Child patient not found'
        });
      }

      console.log(`[getChildPatientByCRNo] Successfully fetched child patient CR: ${cr_number}, Name: ${childPatient.child_name}`);
      res.json({
        success: true,
        data: { childPatient: childPatient.toJSON() }
      });
    } catch (error) {
      console.error('[childPatientController.getChildPatientByCRNo] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get child patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Add child patient to today's list (update assigned_room)
  static async addChildPatientToTodayList(req, res) {
    try {
      const { child_patient_id, assigned_room } = req.body;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;

      // Only Doctors (Admin, Faculty, Resident) can add child patients to today's list
      const allowedRoles = ['Admin', 'Faculty', 'Resident'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only Doctors (Admin, Faculty, Resident) can add child patients to today\'s list.',
          code: 'UNAUTHORIZED_CHILD_PATIENT_ACCESS'
        });
      }

      if (!child_patient_id) {
        return res.status(400).json({
          success: false,
          message: 'child_patient_id is required'
        });
      }

      // Get the child patient
      const childPatient = await ChildPatientRegistration.findById(child_patient_id);
      if (!childPatient) {
        return res.status(404).json({
          success: false,
          message: 'Child patient not found'
        });
      }

      // Get today's date
      const db = require('../config/database');
      const todayResult = await db.query('SELECT CURRENT_DATE as today');
      const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

      // Determine room to use - prefer passed room, otherwise use doctor's current room
      const { hasRoomToday } = require('../utils/roomAssignment');
      const roomStatusForCurrentDoctor = await hasRoomToday(currentUserId);

      if (!roomStatusForCurrentDoctor.hasRoom && !assigned_room) {
        return res.status(400).json({
          success: false,
          message: 'Please select a room for today before adding a child patient. Room selection is required each day.'
        });
      }

      const roomToUse = (assigned_room && assigned_room.trim() !== '') 
        ? assigned_room.trim() 
        : roomStatusForCurrentDoctor.room;

      // Update child patient's assigned_room
      // Use CURRENT_TIMESTAMP to ensure updated_at reflects today's date in IST
      const updateResult = await db.query(
        `UPDATE child_patient_registrations 
         SET assigned_room = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, assigned_room, updated_at`,
        [roomToUse, parseInt(child_patient_id, 10)]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Child patient not found'
        });
      }

      const updatedAt = updateResult.rows[0].updated_at;
      const updatedAtIST = new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const updatedDateIST = new Date(updatedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      console.log(`[addChildPatientToTodayList] Updated child patient ${child_patient_id}: assigned_room="${roomToUse}", updated_at="${updatedAt}" (IST: ${updatedAtIST}, Date: ${updatedDateIST})`);

      // Refresh the child patient data
      const updatedChildPatient = await ChildPatientRegistration.findById(child_patient_id);

      console.log(`[addChildPatientToTodayList] Updated child patient ${child_patient_id} assigned_room to "${roomToUse}"`);

      res.json({
        success: true,
        message: 'Child patient added to today\'s list successfully',
        data: {
          childPatient: updatedChildPatient.toJSON()
        }
      });
    } catch (error) {
      console.error('[childPatientController.addChildPatientToTodayList] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add child patient to today\'s list',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete child patient (Admin only)
  static async deleteChildPatient(req, res) {
    try {
      const { id } = req.params;

      // Validate integer ID
      const childPatientId = parseInt(id, 10);
      if (isNaN(childPatientId) || childPatientId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid child patient ID. ID must be a positive integer",
        });
      }

      console.log(`[deleteChildPatient] Attempting to delete child patient ID: ${id}`);

      const db = require('../config/database');
      const client = await db.getClient();

      try {
        await client.query('BEGIN');

        // 1️⃣ Check if child patient exists
        const childPatientCheckResult = await client.query(
          'SELECT id, child_name FROM child_patient_registrations WHERE id = $1',
          [childPatientId]
        );

        if (!childPatientCheckResult.rows || childPatientCheckResult.rows.length === 0) {
          await client.query('ROLLBACK');
          console.log(`[deleteChildPatient] Child patient with ID ${childPatientId} not found`);
          return res.status(404).json({
            success: false,
            message: "Child patient not found",
          });
        }

        const childPatientName = childPatientCheckResult.rows[0].child_name;
        console.log(`[deleteChildPatient] Child patient found: ${childPatientName} (ID: ${childPatientId})`);

        // 2️⃣ Check for related records
        // 2a: Child clinical proformas
        const childClinicalProformasResult = await client.query(
          'SELECT id FROM child_clinical_proforma WHERE child_patient_id = $1',
          [childPatientId]
        );
        const childClinicalProformas = childClinicalProformasResult.rows || [];
        console.log(`[deleteChildPatient] Found ${childClinicalProformas.length} child clinical proforma(s)`);

        // 2b: Follow-up visits
        const followUpVisitsResult = await client.query(
          'SELECT id FROM followup_visits WHERE child_patient_id = $1',
          [childPatientId]
        );
        const followUpVisits = followUpVisitsResult.rows || [];
        console.log(`[deleteChildPatient] Found ${followUpVisits.length} follow-up visit(s)`);

        // 3️⃣ Delete related records first (in correct order to avoid foreign key constraints)

        // Step 3a: Delete prescriptions linked to child clinical proformas
        if (childClinicalProformas.length > 0) {
          const childClinicalProformaIds = childClinicalProformas.map(cp => cp.id);
          const prescriptionsResult = await client.query(
            'DELETE FROM prescriptions WHERE clinical_proforma_id = ANY($1) RETURNING id',
            [childClinicalProformaIds]
          );
          console.log(`[deleteChildPatient] Deleted ${prescriptionsResult.rowCount || 0} prescription(s) linked to child clinical proformas`);
        }

        // Step 3b: Delete prescriptions directly linked to child patient (by patient_id)
        const standalonePrescriptionsResult = await client.query(
          'DELETE FROM prescriptions WHERE patient_id = $1 RETURNING id',
          [childPatientId]
        );
        console.log(`[deleteChildPatient] Deleted ${standalonePrescriptionsResult.rowCount || 0} standalone prescription(s)`);

        // Step 3c: Delete child clinical proformas
        if (childClinicalProformas.length > 0) {
          await client.query(
            'DELETE FROM child_clinical_proforma WHERE child_patient_id = $1',
            [childPatientId]
          );
          console.log(`[deleteChildPatient] Deleted ${childClinicalProformas.length} child clinical proforma(s)`);
        }

        // Step 3d: Delete follow-up visits
        if (followUpVisits.length > 0) {
          await client.query(
            'DELETE FROM followup_visits WHERE child_patient_id = $1',
            [childPatientId]
          );
          console.log(`[deleteChildPatient] Deleted ${followUpVisits.length} follow-up visit(s)`);
        }

        // Step 4: Delete child patient files/documents if needed
        // Note: Files are stored in the file system, we could optionally delete them here
        // For now, we'll just delete the database record

        // Step 5: Finally, delete the child patient record itself
        await client.query(
          'DELETE FROM child_patient_registrations WHERE id = $1',
          [childPatientId]
        );

        await client.query('COMMIT');

        console.log(`[deleteChildPatient] Successfully deleted child patient ID: ${childPatientId} (${childPatientName})`);

        return res.status(200).json({
          success: true,
          message: "Child patient and all related records deleted successfully",
          deletedChildPatientId: childPatientId,
          deletedChildPatientName: childPatientName,
          deleted: {
            childPatient: true,
            childClinicalProformas: childClinicalProformas.length || 0,
            followUpVisits: followUpVisits.length || 0,
            prescriptions: (childClinicalProformas.length > 0 ? 1 : 0) + (standalonePrescriptionsResult.rowCount || 0)
          }
        });
      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error(`[deleteChildPatient] Database error: ${dbError.message}`);
        throw dbError;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error("[deleteChildPatient] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete child patient and related records",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = ChildPatientController;
