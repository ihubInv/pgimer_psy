const Patient = require('../models/Patient');
const PatientFile = require('../models/PatientFile');
const PatientVisit = require('../models/PatientVisit');
const ClinicalProforma = require('../models/ClinicalProforma');
const ADLFile = require('../models/ADLFile');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/uploadConfig');

class PatientController {
  // Helper function to filter patient data for PWO role
  static filterPatientDataForRole(patientData, userRole) {
    if (!patientData) return patientData;
    
    // If user is Psychiatric Welfare Officer, remove restricted fields
    if (userRole === 'Psychiatric Welfare Officer') {
      const filtered = { ...patientData };
      delete filtered.category;
      delete filtered.unit_consit;
      delete filtered.room_no;
      delete filtered.serial_no;
      delete filtered.unit_days;
      return filtered;
    }
    
    return patientData;
  }

  static async getPatientStats(req, res) {
    try {
      const stats = await Patient.getStats();

      res.json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      console.error('Get patient stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getAgeDistribution(req, res) {
    try {
      const distribution = await Patient.getAgeDistribution();

      res.json({
        success: true,
        data: {
          distribution
        }
      });
    } catch (error) {
      console.error('Get age distribution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get age distribution',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient registrations grouped by date
  static async getRegistrationsByDate(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      const registrations = await Patient.getRegistrationsByDate(start_date || null, end_date || null);

      res.json({
        success: true,
        data: {
          registrations
        }
      });
    } catch (error) {
      console.error('Get registrations by date error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient registrations by date',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patients registered on a specific date
  static async getPatientsByRegistrationDate(req, res) {
    try {
      const { date } = req.params;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required (format: YYYY-MM-DD)'
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const patients = await Patient.getPatientsByRegistrationDate(date);

      res.json({
        success: true,
        data: {
          date,
          count: patients.length,
          patients
        }
      });
    } catch (error) {
      console.error('Get patients by registration date error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patients by registration date',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patients assigned to a specific room for today
  static async getPatientsByRoom(req, res) {
    try {
      const { room_number } = req.params;
      
      if (!room_number || room_number.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Room number is required'
        });
      }

      const patients = await Patient.getPatientsByRoom(room_number.trim());

      res.json({
        success: true,
        data: {
          patients,
          room_number: room_number.trim(),
          count: patients.length
        }
      });
    } catch (error) {
      console.error('Get patients by room error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patients for room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async createPatient(req, res) {
    try {
      const { name, sex, age, assigned_room, cr_no, psy_no, patient_id } = req.body;

      // If patient_id is provided, this is a visit for an existing patient
      // Only Doctors (Admin, Faculty, Resident) can create visits for existing patients
      // Psychiatric Welfare Officers can ONLY create new patients, not visit records for existing patients
      if (patient_id) {
        const userRole = req.user?.role;
        const currentUserId = req.user?.id;
        const allowedRoles = [
          'Admin',                       // For follow-up workflow
          'Faculty',                     // For follow-up workflow
          'Resident'                     // For follow-up workflow
        ];
        
        if (!allowedRoles.includes(userRole)) {
          console.warn(`[createPatient] Unauthorized attempt to create visit for existing patient by role: ${userRole}, user: ${req.user?.email || 'unknown'}`);
          return res.status(403).json({
            success: false,
            message: 'Access denied. Only Doctors (Admin, Faculty, Resident) can create visits for existing patients. Psychiatric Welfare Officers can only create new patients.',
            code: 'UNAUTHORIZED_EXISTING_PATIENT_ACCESS'
          });
        }
        
        const existingPatient = await Patient.findById(patient_id);
        if (!existingPatient) {
          return res.status(404).json({
            success: false,
            message: 'Patient not found'
          });
        }

        // Create a visit record for the existing patient
        // patient_id is now an integer
        const patientIdInt = parseInt(patient_id, 10);
        if (isNaN(patientIdInt)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid patient ID format'
          });
        }
        
        // Get visit count to determine visit type
        const visitCount = await PatientVisit.getVisitCount(patientIdInt);
        const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

        // Determine room for today's visit
        // IMPORTANT BUSINESS RULE:
        //   Room assignment for an existing patient's new visit MUST be based on
        //   the doctor's current room for today, not the patient's previous room.
        //
        // Behaviour:
        //   1) If the frontend passes an explicit assigned_room, we still normalise it
        //      but the final room is always taken from the doctor's current room.
        //   2) If the doctor has not selected a room for today, block visit creation
        //      and ask them to select a room first.
        //
        // This ensures scenarios like:
        //   - Patient was last seen in Room 211
        //   - Doctor is currently in Room 206
        //   => Today's visit (and patient.assigned_room) will be Room 206.
        const requestedRoom =
          assigned_room && String(assigned_room).trim() !== ''
            ? String(assigned_room).trim()
            : null;

        // Always resolve the effective room from the doctor's current room for today
          const { hasRoomToday } = require('../utils/roomAssignment');
          const roomStatusForCurrentDoctor = await hasRoomToday(currentUserId);

          if (!roomStatusForCurrentDoctor.hasRoom) {
            return res.status(400).json({
              success: false,
              message: 'Please select a room for today before creating a visit. Room selection is required each day.'
            });
          }

        let roomToUse = roomStatusForCurrentDoctor.room;

        // Log both the requested room (if any) and the effective room used
        console.log(
          `[createPatient] Existing patient visit – requested room: "${requestedRoom}", ` +
          `effective doctor room for today: "${roomToUse}"`
        );

        // Get today's date in IST (YYYY-MM-DD format)
        // Use CURRENT_DATE from database to ensure consistency with IST timezone
        const db = require('../config/database');
        const todayResult = await db.query('SELECT CURRENT_DATE as today');
        const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
        
        // Check if a doctor has already selected the room for today (if room is provided)
        // This ensures patients added to a room are assigned to the doctor already in that room
        let finalAssignedDoctorId = currentUserId;
        if (roomToUse && roomToUse.trim() !== '') {
          const roomDoctorResult = await db.query(
            `SELECT id, name, role 
             FROM users 
             WHERE current_room = $1 
               AND DATE(room_assignment_time) = $2
             LIMIT 1`,
            [roomToUse.trim(), todayDate]
          );
          
          if (roomDoctorResult.rows.length > 0) {
            finalAssignedDoctorId = roomDoctorResult.rows[0].id;
            console.log(`[createPatient] Found doctor ${finalAssignedDoctorId} (${roomDoctorResult.rows[0].name}) already in room ${roomToUse.trim()}, will assign patient to them`);
          } else {
            // Fallback: ensure we still use the logged-in doctor
            finalAssignedDoctorId = currentUserId;
          }
        }
        
        console.log(`[createPatient] Creating visit for patient ${patientIdInt} with date: ${todayDate}, room: ${roomToUse}, doctor: ${finalAssignedDoctorId}`);
        
        const visit = await PatientVisit.assignPatient({
          patient_id: patientIdInt, // patient_id is now integer
          assigned_doctor_id: finalAssignedDoctorId,
          room_no: roomToUse,
          visit_date: todayDate, // Use database CURRENT_DATE for consistency
          visit_type: visitType, // Determined by visit count
          notes: `Visit created via Existing Patient flow - Visit #${visitCount + 1}`
        });
        
        console.log(`[createPatient] Visit created successfully:`, { visit_id: visit.id, patient_id: patientIdInt, visit_date: visit.visit_date, room_no: visit.room_no, assigned_doctor_id: visit.assigned_doctor_id });

        // CRITICAL: Update patient's assigned_room if a room was provided/used
        // This ensures the patient record reflects the room assignment
        if (roomToUse && roomToUse.trim() !== '') {
          // Check if a doctor has already selected this room for today
          // If so, assign the patient to that doctor
          const roomDoctorResult = await db.query(
            `SELECT id, name, role 
             FROM users 
             WHERE current_room = $1 
               AND DATE(room_assignment_time) = $2
             LIMIT 1`,
            [roomToUse.trim(), todayDate]
          );
          
          let doctorToAssign = null;
          if (roomDoctorResult.rows.length > 0) {
            doctorToAssign = roomDoctorResult.rows[0];
            console.log(`[createPatient] Found doctor ${doctorToAssign.id} (${doctorToAssign.name}) already in room ${roomToUse.trim()}, will assign patient to them`);
          }
          
          // Update patient's assigned_room and assigned_doctor if doctor is in the room
          // Note: The visit record already has the correct doctor from finalAssignedDoctorId
          if (doctorToAssign) {
            await db.query(
              `UPDATE registered_patient 
               SET assigned_room = $1, 
                   assigned_doctor_id = $2,
                   assigned_doctor_name = $3,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [roomToUse.trim(), doctorToAssign.id, doctorToAssign.name, patientIdInt]
            );
            // Update the local patient object
            existingPatient.assigned_doctor_id = doctorToAssign.id;
            existingPatient.assigned_doctor_name = doctorToAssign.name;
            console.log(`[createPatient] Assigned patient ${patientIdInt} to doctor ${doctorToAssign.id} in room ${roomToUse.trim()}`);
          } else {
            await db.query(
              `UPDATE registered_patient 
               SET assigned_room = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [roomToUse.trim(), patientIdInt]
            );
          }
          
          // Update the local patient object to reflect the room change
          existingPatient.assigned_room = roomToUse.trim();
          console.log(`[createPatient] Updated patient ${patientIdInt} assigned_room to "${roomToUse}"`);
        }

        return res.status(201).json({
          success: true,
          message: 'Visit record created successfully',
          data: {
            patient: existingPatient.toJSON(),
            visit: visit,
            visit_count: visitCount + 1, // Include in response
            visit_type: visitType
          }
        });
      }

      // Create new patient
      const patient = await Patient.create({
        name,
        sex,
        age,
        assigned_room,
        cr_no,
        psy_no
      });

      // Filter patient data based on user role before sending response
      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(
        patientJson,
        req.user?.role
      );

      return res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: {
          patient: filteredPatient
        }
      });
    } catch (error) {
      console.error('Patient creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get visit count for a patient
  static async getPatientVisitCount(req, res) {
    try {
      const { id } = req.params;
      const patientIdInt = parseInt(id, 10);
      
      if (isNaN(patientIdInt)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      const visitCount = await PatientVisit.getVisitCount(patientIdInt);
      const visits = await PatientVisit.getPatientVisits(patientIdInt);

      res.status(200).json({
        success: true,
        data: {
          visit_count: visitCount,
          visits: visits,
          next_visit_number: visitCount + 1
        }
      });
    } catch (error) {
      console.error('[getPatientVisitCount] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get visit count',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  
  // Comprehensive patient registration (includes all patient information for MWO)
  static async registerPatientWithDetails(req, res) {
    try {
      console.log('[patientController.registerPatientWithDetails] Received request body with keys:', Object.keys(req.body).length);
      console.log('[patientController.registerPatientWithDetails] Sample fields:', {
        name: req.body.name,
        sex: req.body.sex,
        age: req.body.age,
        mobile_no: req.body.mobile_no,
        father_name: req.body.father_name,
        education: req.body.education,
        patient_income: req.body.patient_income,
        family_income: req.body.family_income,
        distance_from_hospital: req.body.distance_from_hospital
      });

      // Create patient record with all information
      // Map frontend field names to database field names
      const patientData = {
        ...req.body,
        // Map mobile_no to contact_number if provided
        contact_number: req.body.contact_number || req.body.mobile_no,
        filled_by: req.user.id
      };
      
      // Remove mobile_no if it exists (to avoid duplicate)
      if (patientData.mobile_no && patientData.contact_number) {
        delete patientData.mobile_no;
      }

      // For Psychiatric Welfare Officer: Remove fields that should not be set during registration
      if (req.user?.role === 'Psychiatric Welfare Officer') {
        // Remove Out-Patient Card fields that MWO should not set
        delete patientData.category;
        delete patientData.unit_consit;
        delete patientData.room_no;
        delete patientData.serial_no;
        delete patientData.unit_days;
        
        // Ensure worked_up_on is not auto-populated (should be null if not provided)
        if (!req.body.worked_up_on || req.body.worked_up_on === '') {
          patientData.worked_up_on = null;
        }
        
        // Ensure psy_no and special_clinic_no are optional (can be null)
        if (!req.body.psy_no || req.body.psy_no === '') {
          patientData.psy_no = null;
        }
        if (!req.body.special_clinic_no || req.body.special_clinic_no === '') {
          patientData.special_clinic_no = null;
        }
        
        // Validate year_of_marriage is numeric duration (0-80), not calendar year
        if (patientData.year_of_marriage !== null && patientData.year_of_marriage !== undefined) {
          const yearsOfMarriage = parseInt(patientData.year_of_marriage, 10);
          if (isNaN(yearsOfMarriage) || yearsOfMarriage < 0 || yearsOfMarriage > 80) {
            return res.status(400).json({
              success: false,
              message: 'Years of Marriage must be a number between 0 and 80 (duration, not calendar year)'
            });
          }
          patientData.year_of_marriage = yearsOfMarriage;
        }
      }

      // Room is MANDATORY for patient registration - no auto-assignment
      // Validate that assigned_room is provided and is a valid non-empty value
      const roomValue = patientData.assigned_room;
      const roomExistsInBody = 'assigned_room' in req.body;
      const hasRoom = roomExistsInBody && 
                      roomValue !== null && 
                      roomValue !== undefined && 
                      roomValue !== '' &&
                      String(roomValue).trim() !== '' &&
                      !String(roomValue).toLowerCase().includes('select room') &&
                      !String(roomValue).toLowerCase().includes('auto-assign');
      
      console.log(`[patientController] Room validation - assigned_room: "${roomValue}" (type: ${typeof roomValue}), existsInBody: ${roomExistsInBody}, hasRoom: ${hasRoom}`);
      
      // MANDATORY: Room selection is required for patient registration
      if (!hasRoom) {
        console.log(`[patientController] ❌ Room not selected by user ${req.user.id} (role: ${req.user.role}) - rejecting patient registration`);
        return res.status(400).json({
          success: false,
          message: 'Room selection is mandatory. Please select a room before registering the patient.',
          code: 'ROOM_REQUIRED'
        });
      }
      
      console.log(`[patientController] ✅ Using selected room: "${patientData.assigned_room}" for user ${req.user.id}`);
      
      // Trim the room value to ensure consistency
      patientData.assigned_room = String(roomValue).trim();
      
      console.log(`[patientController] Final assigned_room value before Patient.create: "${patientData.assigned_room}"`);
      
      const patient = await Patient.create(patientData);
      
      // Verify that assigned_room was saved correctly
      if (patientData.assigned_room) {
        const db = require('../config/database');
        const verifyResult = await db.query(
          'SELECT assigned_room FROM registered_patient WHERE id = $1',
          [patient.id]
        );
        const savedRoom = verifyResult.rows[0]?.assigned_room;
        console.log(`[patientController] ✅ Patient ${patient.id} created. Saved assigned_room: "${savedRoom}" (expected: "${patientData.assigned_room}")`);
        if (savedRoom !== patientData.assigned_room) {
          console.error(`[patientController] ⚠️  WARNING: Room mismatch! Expected "${patientData.assigned_room}" but saved "${savedRoom}"`);
        }
      }

      // Fetch related data to populate joined fields in response
      let assignedDoctorName = null;
      let assignedDoctorRole = null;
      let filledByName = null;

      // Fetch assigned doctor info if assigned_doctor_id exists
      if (patient.assigned_doctor_id) {
        try {
          const db = require('../config/database');
          const doctorResult = await db.query(
            'SELECT name, role FROM users WHERE id = $1',
            [patient.assigned_doctor_id]
          );
          if (doctorResult.rows.length > 0) {
            assignedDoctorName = doctorResult.rows[0].name;
            assignedDoctorRole = doctorResult.rows[0].role;
          }
        } catch (err) {
          console.error('[patientController] Error fetching assigned doctor:', err);
        }
      }

      // Fetch filled_by user info (MWO who registered the patient)
      if (patient.filled_by) {
        try {
          const db = require('../config/database');
          const filledByResult = await db.query(
            'SELECT name FROM users WHERE id = $1',
            [patient.filled_by]
          );
          if (filledByResult.rows.length > 0) {
            filledByName = filledByResult.rows[0].name;
          }
        } catch (err) {
          console.error('[patientController] Error fetching filled_by user:', err);
        }
      }

      // Build response with populated related fields
      const patientResponse = {
        ...patient.toJSON(),
        assigned_doctor_name: assignedDoctorName,
        assigned_doctor_role: assignedDoctorRole,
        filled_by_name: filledByName
      };

      console.log('[patientController.registerPatientWithDetails] Patient created successfully. ID:', patient.id);
  
      res.status(201).json({
        success: true,
        message: 'Patient registered successfully with complete information',
        data: {
          patient: patientResponse
        }
      });
    } catch (error) {
      console.error('Comprehensive patient registration error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column
      });

      // Handle duplicate CR number (unique constraint violation) gracefully
      const isDuplicateKey = error.code === '23505';
      const isDuplicateCR =
        isDuplicateKey &&
        (
          (typeof error.message === 'string' && error.message.includes('registered_patient_cr_no_key')) ||
          (error.originalError && error.originalError.constraint === 'registered_patient_cr_no_key')
        );

      if (isDuplicateCR) {
        return res.status(409).json({
          success: false,
          message: 'A patient with this CR number already exists. Please use Search by CR No to open the existing patient.',
          code: 'DUPLICATE_CR_NO'
        });
      }

      if (isDuplicateKey) {
        return res.status(409).json({
          success: false,
          message: 'A similar patient record already exists. Please verify the details before creating a new record.',
          code: 'DUPLICATE_RECORD'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to register patient with details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column
        } : undefined
      });
    }
  }

  // Get all patients with pagination and filters
  static async getAllPatients(req, res) {
    try {
      // Auto-complete old visits from previous days (runs silently in background)
      // This ensures that when a new day starts, all incomplete visits from previous days are marked as completed
      try {
        await PatientVisit.autoCompleteOldVisits();
      } catch (autoCompleteError) {
        // Log error but don't fail the request - auto-completion is a background task
        console.error('[getAllPatients] Auto-complete old visits error (non-fatal):', autoCompleteError);
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};

      // If id is provided, redirect to getPatientById for better performance
      if (req.query.id) {
        // getPatientById expects id in req.params, so we need to set it
        req.params = req.params || {};
        req.params.id = req.query.id;
        return PatientController.getPatientById(req, res);
      }

      // Check if search parameter is provided
      if (req.query.search && req.query.search.trim().length >= 2) {
        const result = await Patient.search(req.query.search.trim(), page, limit);
        return res.json({
          success: true,
          data: result
        });
      }

      // Apply filters
      if (req.query.sex) filters.sex = req.query.sex;
      // if (req.query.case_complexity) filters.case_complexity = req.query.case_complexity;
      if (req.query.has_adl_file !== undefined) filters.has_adl_file = req.query.has_adl_file === 'true';
      if (req.query.file_status) filters.file_status = req.query.file_status;
      if (req.query.assigned_room) filters.assigned_room = req.query.assigned_room;
      
      // Filter by registration date (for Today's Patients view)
      // When date is provided, filter patients created on that specific date
      if (req.query.date) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(req.query.date)) {
          filters.date = req.query.date;
        }
      }

      // Also fetch child patients if filtering by room or date
      let childPatients = [];
      let childPatientsTotal = 0;
      if (filters.assigned_room || filters.date) {
        try {
          const ChildPatientRegistration = require('../models/ChildPatientRegistration');
          const childFilters = {};
          if (filters.assigned_room) {
            childFilters.assigned_room = filters.assigned_room;
          }
          if (filters.date) {
            childFilters.date = filters.date;
            console.log(`[getAllPatients] Fetching child patients with date filter: ${filters.date}`);
          }
          const childResult = await ChildPatientRegistration.findAll(page, limit, childFilters);
          childPatients = childResult.child_patients || [];
          childPatientsTotal = childResult.pagination?.total || 0;
          console.log(`[getAllPatients] Found ${childPatients.length} child patients (total: ${childPatientsTotal})`);
          
          // Get visit status for child patients from follow-up visits
          const db = require('../config/database');
          const today = filters.date || new Date().toISOString().slice(0, 10);
          const childPatientIds = childPatients.map(cp => cp.id);
          let visitStatusMap = {};
          
          if (childPatientIds.length > 0) {
            try {
              const visitStatusResult = await db.query(
                `SELECT child_patient_id, visit_status 
                 FROM followup_visits 
                 WHERE child_patient_id = ANY($1::int[])
                 AND DATE(visit_date) = $2
                 ORDER BY created_at DESC`,
                [childPatientIds, today]
              );
              
              // Create a map of child_patient_id -> visit_status (prioritize 'completed' status)
              visitStatusResult.rows.forEach(row => {
                if (!visitStatusMap[row.child_patient_id] || row.visit_status === 'completed') {
                  visitStatusMap[row.child_patient_id] = row.visit_status;
                }
              });
            } catch (err) {
              console.error('[getAllPatients] Error fetching child patient visit status:', err);
            }
          }
          
          // Convert child patients to compatible format
          childPatients = childPatients.map(cp => ({
            id: cp.id,
            name: cp.child_name,
            cr_no: cp.cr_number,
            psy_no: null,
            special_clinic_no: cp.cgc_number,
            assigned_room: cp.assigned_room,
            assigned_doctor_id: null,
            assigned_doctor_name: null,
            assigned_doctor_role: null,
            has_adl_file: false,
            case_complexity: 'simple',
            sex: cp.sex,
            age: null,
            age_group: cp.age_group,
            created_at: cp.created_at,
            updated_at: cp.updated_at, // CRITICAL: Include updated_at for filtering existing patients added to today's list
            visit_status: visitStatusMap[cp.id] || null, // Add visit_status from follow-up visits
            patient_type: 'child',
            filled_by_name: cp.filled_by_name || null,
            filled_by_role: cp.filled_by_role || null
          }));
        } catch (childError) {
          console.error('[getAllPatients] Error fetching child patients:', childError);
          // Continue without child patients if there's an error
        }
      }

      // Limit the maximum page size to prevent timeouts
      // Increase cap so "Today's Patients" view can see all patients with visits today
      // while still protecting against unbounded queries.
      const safeLimit = Math.min(limit, 1000); // Cap at 1000 instead of 100
      const result = await Patient.findAll(page, safeLimit, filters);

      // Enrich with latest assignment info
      try {
        const db = require('../config/database');
        const patientIds = (result.patients || []).map(p => p.id);
        if (patientIds.length > 0) {
          // Use CURRENT_DATE from database to ensure consistency with IST timezone
          const todayResult = await db.query('SELECT CURRENT_DATE as today');
          const today = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);
          
          console.log(`[getAllPatients] Fetching visits for ${patientIds.length} patients (sample IDs: ${patientIds.slice(0, 3).join(', ')})`);
          console.log(`[getAllPatients] Using today's date: ${today}`);
          
          // Fetch visits with assigned_doctor info using PostgreSQL
          let visits = [];
          let visitsToday = [];
          let visitsTodayError = false;
          
          try {
            const visitsResult = await db.query(
              `SELECT patient_id, visit_date, assigned_doctor_id, room_no, visit_status
               FROM patient_visits
               WHERE patient_id = ANY($1)
               ORDER BY visit_date DESC`,
              [patientIds]
            );
            
            visits = visitsResult.rows || [];
            console.log(`[getAllPatients] Found ${visits.length} total visits`);
            
            const visitsTodayResult = await db.query(
              `SELECT patient_id, visit_date, assigned_doctor_id, visit_status, room_no
               FROM patient_visits
               WHERE patient_id = ANY($1) AND DATE(visit_date) = $2
               ORDER BY created_at DESC`,
              [patientIds, today]
            );
            
            visitsToday = visitsTodayResult.rows || [];
            console.log(`[getAllPatients] Found ${visitsToday.length} visits for today (${today})`);
          } catch (queryErr) {
            console.error('[getAllPatients] Error in PostgreSQL query:', queryErr);
            visitsTodayError = true;
          }
          
          // Fetch clinical proformas created today
          let proformasToday = [];
          let proformasTodayError = false;
          try {
            const proformasTodayResult = await db.query(
              `SELECT patient_id, created_at
               FROM clinical_proforma
               WHERE patient_id = ANY($1) 
                 AND DATE(created_at) = $2
               ORDER BY created_at DESC`,
              [patientIds, today]
            );
            
            proformasToday = proformasTodayResult.rows || [];
          } catch (queryErr) {
            console.error('[getAllPatients] Error fetching proformas today:', queryErr);
            proformasTodayError = true;
          }
          
          console.log(`[getAllPatients] Found ${visits?.length || 0} visits, ${visitsToday?.length || 0} visits today, ${proformasToday?.length || 0} proformas today`);

          // Build set of patients with proformas today
          const patientsWithProformaToday = new Set();
          if (!proformasTodayError && Array.isArray(proformasToday)) {
            proformasToday.forEach(p => patientsWithProformaToday.add(String(p.patient_id)));
          }

          if (Array.isArray(visits) && visits.length > 0) {
            // Get unique assigned_doctor IDs
            const assignedDoctorIds = [...new Set(
              visits
                .map(v => v.assigned_doctor_id)
                .filter(id => id !== null && id !== undefined)
            )];

            // Fetch doctor information
            let doctorsMap = {};
            if (assignedDoctorIds.length > 0) {
              const doctorsResult = await db.query(
                `SELECT id, name, role
                 FROM users
                 WHERE id = ANY($1)`,
                [assignedDoctorIds]
              );

              if (doctorsResult.rows) {
                doctorsMap = doctorsResult.rows.reduce((acc, doc) => {
                  acc[doc.id] = doc;
                  return acc;
                }, {});
              }
            }

            // Group visits by patient_id (get latest)
            // Use integer comparison for IDs
            const latestByPatient = new Map();
            for (const v of visits) {
              const visitPatientId = String(v.patient_id);
              if (!latestByPatient.has(visitPatientId)) {
                latestByPatient.set(visitPatientId, v);
              }
            }
            
            const patientsWithVisitToday = new Set();
            if (!visitsTodayError && Array.isArray(visitsToday)) {
              visitsToday.forEach(v => patientsWithVisitToday.add(String(v.patient_id)));
            }
            
            result.patients = result.patients.map(p => {
              const patientIdStr = String(p.id);
              const latest = latestByPatient.get(patientIdStr);
              const hasVisitToday = patientsWithVisitToday.has(patientIdStr);
              const hasProformaToday = patientsWithProformaToday.has(patientIdStr);
              const visitInfo = hasVisitToday && visitsToday?.find(v => String(v.patient_id) === patientIdStr) 
                ? visitsToday.find(v => String(v.patient_id) === patientIdStr)
                : latest;
              
              // Use doctor from visit if available, otherwise use from patient record
              const doctorId = visitInfo?.assigned_doctor_id || latest?.assigned_doctor_id || p.assigned_doctor_id;
              const doctor = doctorId ? doctorsMap[doctorId] : null;
              
              return {
                ...p,
                assigned_doctor_id: doctorId || p.assigned_doctor_id || null,
                // Use doctor from visits if available, otherwise use from patient record (already fetched in findAll)
                // Filter out "Unknown Doctor" - treat it as null
                assigned_doctor_name: doctor?.name || (p.assigned_doctor_name && p.assigned_doctor_name !== 'Unknown Doctor' ? p.assigned_doctor_name : null) || null,
                assigned_doctor_role: doctor?.role || p.assigned_doctor_role || null,
                last_assigned_date: latest?.visit_date || null,
                visit_date: visitInfo?.visit_date || null,
                visit_status: visitInfo?.visit_status || latest?.visit_status || null,
                has_visit_today: hasVisitToday,
                has_proforma_today: hasProformaToday,
              };
            });
          } else {
            // If no visits found, ensure assigned_doctor fields are null (filter out "Unknown Doctor")
            result.patients = result.patients.map(p => ({
              ...p,
              assigned_doctor_id: p.assigned_doctor_id || null,
              assigned_doctor_name: (p.assigned_doctor_name && p.assigned_doctor_name !== 'Unknown Doctor') ? p.assigned_doctor_name : null,
              assigned_doctor_role: p.assigned_doctor_role || null,
              has_visit_today: false,
              has_proforma_today: patientsWithProformaToday.has(String(p.id)),
            }));
          }
        }
      } catch (err) {
        console.error('[getAllPatients] Error enriching patient data:', err);
        // Ensure fields are set to null if enrichment fails
        if (result.patients) {
          result.patients = result.patients.map(p => ({
            ...p,
            assigned_doctor_id: p.assigned_doctor_id || null,
            assigned_doctor_name: p.assigned_doctor_name || null,
            assigned_doctor_role: p.assigned_doctor_role || null,
          }));
        }
      }

      // Merge child patients with adult patients (if any were fetched)
      if (childPatients.length > 0) {
        // Combine adult and child patients, sort by created_at DESC
        const allPatients = [...(result.patients || []), ...childPatients].sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });
        
        // Update pagination to include child patients
        result.patients = allPatients;
        result.pagination.total = (result.pagination?.total || 0) + childPatientsTotal;
        result.pagination.pages = Math.ceil(result.pagination.total / limit);
      }

      // Filter patient data for PWO role
      // NOTE: Express does not bind `this` when calling handlers, so we must reference the class directly
      if (result.patients && Array.isArray(result.patients)) {
        result.patients = result.patients.map(patient =>
          PatientController.filterPatientDataForRole(patient, req.user?.role)
        );
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get all patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patients',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Search patients
  static async searchPatients(req, res) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters long'
        });
      }

      // SECURITY FIX #2.9: Additional input validation (WAF already checks, but this is defense in depth)
      // The search term is already validated by WAF middleware, but we ensure it's safe for database queries
      // Parameterized queries protect against SQL injection, but we still sanitize for logging/display
      const searchTerm = q.trim();
      
      // Note: We use parameterized queries in Patient.search(), so SQL injection is prevented
      // This is just for additional safety and output encoding
      const result = await Patient.search(searchTerm, page, limit);
      
      // Filter patient data for PWO role
      if (result.patients && Array.isArray(result.patients)) {
        result.patients = result.patients.map(patient =>
          PatientController.filterPatientDataForRole(patient, req.user?.role)
        );
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Search patients error:', error);
      
      // SECURITY FIX #2.9: Don't expose error details that might contain user input
      // The WAF should have blocked malicious input, but we still sanitize error messages
      res.status(500).json({
        success: false,
        message: 'Failed to search patients',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient by ID (integer)
  static async getPatientById(req, res) {
    try {
      const { id } = req.params;
      
      // Pass ID to Patient.findById (integer)
      console.log(`[getPatientById] Fetching patient with ID: ${id} (type: ${typeof id})`);
      
      const patient = await Patient.findById(id);
  console.log(">>>>>>>",patient)
      if (!patient) {
        console.log(`[getPatientById] Patient with ID ${id} not found`);
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Verify ID matches (integer comparison)
      const requestedId = parseInt(id, 10);
      const returnedId = parseInt(patient.id, 10);
      const idMatches = (typeof returnedId === 'string' && returnedId.includes('-'))
        ? returnedId === requestedId // Integer comparison
        : parseInt(returnedId, 10) === parseInt(requestedId, 10); // Integer comparison

      if (!idMatches) {
        console.error(`[getPatientById] CRITICAL: ID mismatch! Requested: ${requestedId}, Returned: ${returnedId}`);
        return res.status(500).json({
          success: false,
          message: 'Data integrity error: Patient ID mismatch'
        });
      }

      console.log(`[getPatientById] Successfully fetched patient ID: ${patient.id}, Name: ${patient.name}`);

      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(
        patientJson,
        req.user?.role
      );

      res.json({
        success: true,
        data: {
          patient: filteredPatient
        }
      });
    } catch (error) {
      console.error('[getPatientById] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient by CR number (unified search for both adult and child patients)
  static async getPatientByCRNo(req, res) {
    try {
      const { cr_no } = req.params;
      
      if (!cr_no || cr_no.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'CR number is required'
        });
      }

      const db = require('../config/database');
      const crNumber = cr_no.trim();

      // Unified query: Search both adult and child patients in a single query
      // This ensures CR numbers are globally unique and searchable regardless of patient type
      const query = `
        SELECT 
          'adult' as patient_type,
          p.id,
          p.name,
          p.cr_no,
          p.psy_no,
          p.special_clinic_no,
          p.sex,
          p.age,
          NULL::text as age_group,
          p.assigned_room,
          p.assigned_doctor_id,
          p.contact_number,
          p.created_at,
          p.updated_at,
          p.filled_by,
          (
            SELECT u.name FROM users u WHERE u.id = p.filled_by LIMIT 1
          ) AS filled_by_name,
          (
            SELECT u.role FROM users u WHERE u.id = p.filled_by LIMIT 1
          ) AS filled_by_role
        FROM registered_patient p
        WHERE TRIM(COALESCE(p.cr_no::text, '')) = $1
        
        UNION ALL
        
        SELECT 
          'child' as patient_type,
          cpr.id,
          cpr.child_name as name,
          cpr.cr_number as cr_no,
          NULL::text as psy_no,
          cpr.cgc_number as special_clinic_no,
          cpr.sex,
          NULL::integer as age,
          cpr.age_group,
          cpr.assigned_room,
          NULL::integer as assigned_doctor_id,
          NULL::text as contact_number,
          cpr.created_at,
          cpr.updated_at,
          cpr.filled_by,
          u_filled.name as filled_by_name,
          u_filled.role as filled_by_role
        FROM child_patient_registrations cpr
        LEFT JOIN users u_filled ON u_filled.id = cpr.filled_by
        WHERE TRIM(COALESCE(cpr.cr_number::text, '')) = $1
        
        LIMIT 1
      `;

      const result = await db.query(query, [crNumber]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const patientData = result.rows[0];
      const isChildPatient = patientData.patient_type === 'child';

      // Format response consistently
      let patientResponse;
      if (isChildPatient) {
        // Child patient - fetch full details
        const ChildPatientRegistration = require('../models/ChildPatientRegistration');
        const childPatient = await ChildPatientRegistration.findById(patientData.id);
        if (!childPatient) {
          return res.status(404).json({
            success: false,
            message: 'Patient not found'
          });
        }
        patientResponse = {
          id: childPatient.id,
          name: childPatient.child_name,
          cr_no: childPatient.cr_number,
          cr_number: childPatient.cr_number, // Alias for consistency
          psy_no: null,
          special_clinic_no: childPatient.cgc_number,
          cgc_number: childPatient.cgc_number, // Alias for consistency
          sex: childPatient.sex,
          age: null,
          age_group: childPatient.age_group,
          assigned_room: childPatient.assigned_room,
          assigned_doctor_id: null,
          contact_number: null,
          created_at: childPatient.created_at,
          updated_at: childPatient.updated_at,
          patient_type: 'child',
          filled_by: childPatient.filled_by,
          filled_by_name: patientData.filled_by_name,
          filled_by_role: patientData.filled_by_role,
          // Include all child patient fields
          ...childPatient.toJSON()
        };
      } else {
        // Adult patient
        const patient = await Patient.findById(patientData.id);
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: 'Patient not found'
          });
        }
      const patientJson = patient.toJSON();
        // Use the static helper on the controller class
        patientResponse = PatientController.filterPatientDataForRole(
        patientJson,
        req.user?.role
      );
        patientResponse.patient_type = 'adult';
      }

      res.json({
        success: true,
        data: {
          patient: patientResponse,
          patient_type: isChildPatient ? 'child' : 'adult'
        }
      });
    } catch (error) {
      console.error('[getPatientByCRNo] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }





  static async updatePatient(req, res) {
    try {
      const { id } = req.params;
  
      // Find the patient by ID
      const patient = await Patient.findById(id);
  
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }
  
      // Allowed fields for update (matching Patient model's update method and DB schema)
      const allowedFields = [
        'name',
        'sex',
        'age',
        'date',
        'contact_number',
        'category',
        'father_name',
        'department',
        'unit_consit',
        'room_no',
        'serial_no',
        'file_no',
        'unit_days',
        'seen_in_walk_in_on',
        'worked_up_on',
        'special_clinic_no',
        'age_group',
        'marital_status',
        'year_of_marriage',
        'no_of_children_male',
        'no_of_children_female',
        'occupation',
        'education',
        'locality',
        'patient_income',
        'family_income',
        'religion',
        'family_type',
        'head_name',
        'head_age',
        'head_relationship',
        'head_education',
        'head_occupation',
        'head_income',
        'distance_from_hospital',
        'mobility',
        'referred_by',
        'address_line',
        'country',
        'state',
        'district',
        'city',
        'pin_code',
        // Permanent Address fields
        'permanent_address_line_1', 'permanent_city_town_village',
        'permanent_district', 'permanent_state', 'permanent_pin_code', 'permanent_country',
        // Present Address fields
        'present_address_line_1', 'present_address_line_2', 'present_city_town_village', 'present_city_town_village_2',
        'present_district', 'present_district_2', 'present_state', 'present_state_2',
        'present_pin_code', 'present_pin_code_2', 'present_country', 'present_country_2',
        // Local Address field
        'local_address',
        'assigned_room',
        'assigned_doctor_id',
        'assigned_doctor_name',
        'has_adl_file',
        'file_status'
      ];
  
      // Build update data object only with defined fields that have actual values
      // IMPORTANT: Only include fields that are explicitly provided AND have meaningful values
      // This prevents null/empty values from overwriting existing data
      const updateData = {};
      for (const field of allowedFields) {
        // Only process fields that are explicitly provided (not undefined)
        if (req.body[field] !== undefined) {
          const value = req.body[field];
          
          // Skip null values and empty strings - these would overwrite existing data
          // Only include if the value is explicitly meant to clear a field (we'll handle this case-by-case)
          if (value === null || value === '') {
            // For certain fields, allow null to clear them (e.g., assigned_doctor_id can be null)
            // For most fields, skip null/empty to preserve existing values
            if (field === 'assigned_doctor_id' || field === 'assigned_doctor_name' || field === 'assigned_room') {
              // These fields can be explicitly cleared
              updateData[field] = null;
            }
            // For all other fields, skip null/empty values to preserve existing data
            continue;
          }
          
          // Handle assigned_doctor_id - it's integer
          if (field === 'assigned_doctor_id') {
            // Convert to integer
            const doctorIdInt = parseInt(value, 10);
            if (!isNaN(doctorIdInt) && doctorIdInt > 0) {
              // CRITICAL: Check if doctor has selected a room for TODAY
              // Room selection is day-specific - doctor must select room each day
              const { hasRoomToday } = require('../utils/roomAssignment');
              const roomStatus = await hasRoomToday(doctorIdInt);
              
              if (!roomStatus.hasRoom) {
                return res.status(400).json({ 
                  success: false, 
                  message: 'Please select a room for today before assigning patients. Room selection is required each day.' 
                });
              }
              
              updateData[field] = doctorIdInt;
              
              // If assigned_doctor_id is provided but assigned_doctor_name is not, fetch it
              if (!req.body.assigned_doctor_name) {
                try {
                  const db = require('../config/database');
                  const doctorResult = await db.query(
                    'SELECT name FROM users WHERE id = $1',
                    [doctorIdInt]
                  );
                  if (doctorResult.rows.length > 0) {
                    updateData.assigned_doctor_name = doctorResult.rows[0].name;
                  }
                } catch (err) {
                  console.warn('[updatePatient] Could not fetch doctor name:', err.message);
                }
              }
              
              // Use doctor's selected room if assigned_room not provided
              if (!req.body.assigned_room && roomStatus.room) {
                updateData.assigned_room = roomStatus.room;
              }
            }
          } else {
            // For all other fields, include the value as-is (it's not null/empty)
            updateData[field] = value;
          }
        }
      }
  
      console.log('[updatePatient] Updating patient with data:', JSON.stringify(updateData, null, 2));
      console.log('[updatePatient] Fields to update:', Object.keys(updateData));
      
      // Verify we have fields to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update. All provided values were null or empty.',
        });
      }
  
      // If assigned_room is being updated, also update today's visit record
      if (updateData.assigned_room !== undefined) {
        const today = new Date().toISOString().slice(0, 10);
        const db = require('../config/database');
        
        // Update today's visit record with the new room
        await db.query(
          `UPDATE patient_visits 
           SET room_no = $1, updated_at = CURRENT_TIMESTAMP
           WHERE patient_id = $2 AND visit_date = $3`,
          [updateData.assigned_room, parseInt(id, 10), today]
        );
        
        console.log(`[updatePatient] Updated today's visit record for patient ${id} with room ${updateData.assigned_room}`);
      }
  
      // Perform the update
      await patient.update(updateData);
  
      // Handle file uploads if any files are present OR if files need to be removed
      console.log('[updatePatient] Checking for files. req.files:', req.files ? (Array.isArray(req.files) ? req.files.length + ' files' : 'object with keys: ' + Object.keys(req.files).join(', ')) : 'no files');
      console.log('[updatePatient] req.body keys:', Object.keys(req.body || {}));
      console.log('[updatePatient] files_to_remove in body:', req.body.files_to_remove || req.body['files_to_remove[]'] || 'none');
      
      const hasFiles = req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.keys(req.files).length > 0);
      const hasFilesToRemove = !!(req.body.files_to_remove || req.body['files_to_remove[]']);
      
      if (hasFiles || hasFilesToRemove) {
        console.log('[updatePatient] Processing', req.files.length, 'file(s) for patient', id);
        try {
          const PatientFileController = require('./patientFileController');
          
          // Parse files_to_remove from request body
          // FormData sends arrays as multiple fields with same name, so check both formats
          let filesToRemove = [];
          if (req.body.files_to_remove) {
            if (Array.isArray(req.body.files_to_remove)) {
              filesToRemove = req.body.files_to_remove;
            } else if (typeof req.body.files_to_remove === 'string') {
              try {
                filesToRemove = JSON.parse(req.body.files_to_remove);
              } catch (e) {
                // If not JSON, treat as single value
                filesToRemove = [req.body.files_to_remove];
              }
            }
          }
          // Also check for files_to_remove[] format (FormData array)
          if (req.body['files_to_remove[]']) {
            if (Array.isArray(req.body['files_to_remove[]'])) {
              filesToRemove = [...filesToRemove, ...req.body['files_to_remove[]']];
            } else {
              filesToRemove.push(req.body['files_to_remove[]']);
            }
          }
          
          console.log('[updatePatient] Files to remove:', filesToRemove);
          console.log('[updatePatient] New files:', req.files.map(f => f.originalname));
          
          // Create a proper request object for updatePatientFiles
          const fileUpdateReq = {
            params: { patient_id: id },
            body: { files_to_remove: filesToRemove },
            files: req.files,
            user: req.user
          };
          
          // Create a proper response object that can handle the response
          let fileUpdateSuccess = false;
          let fileUpdateError = null;
          
          const fileUpdateRes = {
            status: (code) => ({
              json: (data) => {
                if (code >= 400) {
                  console.error('[updatePatient] File update error:', code, data);
                  fileUpdateError = data;
                } else {
                  console.log('[updatePatient] Files updated successfully:', data);
                  fileUpdateSuccess = true;
                }
              }
            })
          };
          
          // Update files using PatientFileController
          await PatientFileController.updatePatientFiles(fileUpdateReq, fileUpdateRes);
          
          if (fileUpdateError) {
            console.error('[updatePatient] File update failed:', fileUpdateError);
            // Don't fail the entire update, but log the error
          }
        } catch (fileError) {
          console.error('[updatePatient] Error updating files:', fileError);
          console.error('[updatePatient] Error stack:', fileError.stack);
          // Don't fail the entire update if file upload fails
          // The patient data update was successful
        }
      }
  
      // Re-fetch updated patient (findById already includes doctor info from patient_visits)
      const updatedPatient = await Patient.findById(id);
  
      if (!updatedPatient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found after update',
        });
      }
  
      res.json({
        success: true,
        message: 'Patient updated successfully' + (req.files && req.files.length > 0 ? ` with ${req.files.length} file(s)` : ''),
        data: { patient: updatedPatient.toJSON() },
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update patient',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  }
  
  
  
  // Get patient's complete profile
  static async getPatientProfile(req, res) {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const [visitHistory, clinicalRecords, adlFiles] = await Promise.all([
        patient.getVisitHistory(),
        patient.getClinicalRecords(),
        patient.getADLFiles()
      ]);

      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(patientJson, req.user?.role);

      res.json({
        success: true,
        data: {
          patient: filteredPatient,
          visitHistory,
          clinicalRecords,
          adlFiles
        }
      });
    } catch (error) {
      console.error('Get patient profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient's visit history
  static async getPatientVisitHistory(req, res) {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      let visitHistory = [];
      try {
        visitHistory = await patient.getVisitHistory();
      } catch (historyError) {
        // Log but don't fail the whole request – return empty history instead
        console.error('[getPatientVisitHistory] Non-fatal visit history error, returning empty history:', historyError);
        visitHistory = [];
      }

      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(patientJson, req.user?.role);

      res.json({
        success: true,
        data: {
          patient: filteredPatient,
          visitHistory
        }
      });
    } catch (error) {
      console.error('Get patient visit history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient visit history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient's clinical records
  static async getPatientClinicalRecords(req, res) {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const clinicalRecords = await patient.getClinicalRecords();

      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(patientJson, req.user?.role);

      res.json({
        success: true,
        data: {
          patient: filteredPatient,
          clinicalRecords
        }
      });
    } catch (error) {
      console.error('Get patient clinical records error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient clinical records',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get patient's ADL files
  static async getPatientADLFiles(req, res) {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const adlFiles = await patient.getADLFiles();

      const patientJson = patient.toJSON();
      // Use the static helper on the controller class (not `this`, which is undefined in Express handlers)
      const filteredPatient = PatientController.filterPatientDataForRole(patientJson, req.user?.role);

      res.json({
        success: true,
        data: {
          patient: filteredPatient,
          adlFiles
        }
      });
    } catch (error) {
      console.error('Get patient ADL files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient ADL files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  

  static async deletePatient(req, res) {
    try {
      const { id } = req.params;
  
      // Validate integer ID
      const patientId = parseInt(id, 10);
      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid patient ID. ID must be a positive integer",
        });
      }
  
      console.log(`[deletePatient] Attempting to delete patient ID: ${id}`);

      const db = require('../config/database');
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        // 1️⃣ Check if patient exists in registered_patient table
        const patientCheckResult = await client.query(
          'SELECT id FROM registered_patient WHERE id = $1',
          [id]
        );
        
        if (!patientCheckResult.rows || patientCheckResult.rows.length === 0) {
          await client.query('ROLLBACK');
          console.log(`[deletePatient] Patient with ID ${id} not found in registered_patient`);
          return res.status(404).json({
            success: false,
            message: "Patient not found",
          });
        }
        
        console.log(`[deletePatient] Patient found in registered_patient table`);
        
        // 2️⃣ Check if patient_id exists in clinical_proforma table
        const clinicalResult = await client.query(
          'SELECT id FROM clinical_proforma WHERE patient_id = $1',
          [id]
        );
        const clinicalProformas = clinicalResult.rows || [];
        console.log(`[deletePatient] Found ${clinicalProformas.length} clinical proforma record(s) for patient ${id}`);
        
        // 3️⃣ Check if patient_id exists in adl_files table
        const adlResult = await client.query(
          'SELECT id FROM adl_files WHERE patient_id = $1',
          [id]
        );
        const adlFiles = adlResult.rows || [];
        console.log(`[deletePatient] Found ${adlFiles.length} ADL file record(s) for patient ${id}`);
        
        // 4️⃣ Delete related records first (in correct order to avoid foreign key constraints)
        
        // Step 4a: Delete prescriptions linked to clinical proformas
        if (clinicalProformas.length > 0) {
          const clinicalProformaIds = clinicalProformas.map(cp => cp.id);
          await client.query(
            'DELETE FROM prescriptions WHERE clinical_proforma_id = ANY($1)',
            [clinicalProformaIds]
          );
          console.log(`[deletePatient] Deleted prescriptions for clinical proformas`);
        }
        
        // Step 4b: Delete ADL files
        if (adlFiles.length > 0) {
          await client.query(
            'DELETE FROM adl_files WHERE patient_id = $1',
            [id]
          );
          console.log(`[deletePatient] Deleted ${adlFiles.length} ADL file(s)`);
        }

        
        
        // Step 4c: Delete clinical proformas
        if (clinicalProformas.length > 0) {
          await client.query(
            'DELETE FROM clinical_proforma WHERE patient_id = $1',
            [id]
          );
          console.log(`[deletePatient] Deleted ${clinicalProformas.length} clinical proforma(s)`);
        }
        
        // Step 4d: Delete patient visits
        await client.query(
          'DELETE FROM patient_visits WHERE patient_id = $1',
          [id]
        );
        console.log(`[deletePatient] Deleted patient visits`);
        
        // Step 5: Finally, delete the patient record itself
        await client.query(
          'DELETE FROM registered_patient WHERE id = $1',
          [id]
        );
        
        await client.query('COMMIT');
      
        console.log(`[deletePatient] Successfully deleted patient ID: ${id}`);
        
        return res.status(200).json({
          success: true,
          message: "Patient and all related records deleted successfully",
          deletedPatientId: id,
          deleted: {
            patient: true,
            clinicalProformas: clinicalProformas.length || 0,
            adlFiles: adlFiles.length || 0
          }
        });
      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error(`[deletePatient] Database error: ${dbError.message}`);
        throw dbError;
      } finally {
        client.release();
      }
  
    } catch (error) {
      console.error("[deletePatient] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete patient and related records",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  
  
  // Assign patient to a doctor
  static async assignPatient(req, res) {
    try {
      const { patient_id, assigned_doctor_id, room_no, visit_date, notes } = req.body;

      if (!patient_id || !assigned_doctor_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'patient_id and assigned_doctor_id are required' 
        });
      }

      // Validate patient_id is an integer
      const patientIdInt = parseInt(patient_id, 10);
      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid patient ID format. Patient ID must be a positive integer.'
        });
      }
      
      // Validate doctor_id is an integer
      const doctorIdInt = parseInt(assigned_doctor_id, 10);
      if (isNaN(doctorIdInt) || doctorIdInt <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid doctor ID format. Doctor ID must be a positive integer.'
        });
      }
      
      // Verify patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          message: 'Patient not found' 
        });
      }

      // CRITICAL: Check if doctor has selected a room for TODAY
      // Room selection is day-specific - doctor must select room each day
      const { hasRoomToday } = require('../utils/roomAssignment');
      const roomStatus = await hasRoomToday(doctorIdInt);
      
      if (!roomStatus.hasRoom) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please select a room for today before assigning patients. Room selection is required each day.' 
        });
      }
      
      // Use integers for both patient and doctor IDs
      const patientIdForVisit = patientIdInt;
      const doctorIdForVisit = doctorIdInt;
      
      // Use doctor's selected room if room_no not provided
      const roomToUse = room_no || roomStatus.room;
   
      const assignment = await PatientVisit.assignPatient({ 
        patient_id: patientIdForVisit, 
        assigned_doctor_id: doctorIdForVisit, 
        room_no: roomToUse, 
        visit_date, 
        notes 
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Patient assigned successfully', 
        data: { assignment } 
      });
    } catch (error) {
      console.error('Assign patient error:', error);
      
      // Check if error is due to invalid ID format
      if (error.message && (
        error.message.includes('invalid input syntax for type integer') ||
        error.message.includes('Invalid patient_id format') ||
        error.message.includes('type mismatch')
      )) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid ID format. Patient ID and Doctor ID must be valid integers.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to assign patient', 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
      });
    }
  }

  // Mark patient visit as completed (supports both adult and child patients)
  static async markVisitCompleted(req, res) {
    try {
      const { id } = req.params; // Use 'id' to match validateId middleware
      const { visit_date, patient_type } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
      }

      const patientIdInt = parseInt(id, 10);
      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if this is a child patient
      const isChildPatient = patient_type === 'child';
      
      if (isChildPatient) {
        // Handle child patients - update child_patient_registrations table
        const ChildPatientRegistration = require('../models/ChildPatientRegistration');
        const db = require('../config/database');
        
        // Check if child patient exists
        const childPatient = await ChildPatientRegistration.findById(patientIdInt);
        if (!childPatient) {
          return res.status(404).json({
            success: false,
            message: 'Child patient not found'
          });
        }

        // For child patients, we need to track completion status
        // Since child_patient_registrations doesn't have visit_status, we'll create/update a follow-up visit
        // This ensures visit_status is available for filtering
        const today = visit_date || new Date().toISOString().slice(0, 10);
        
        // Try to find a follow-up visit for today
        const followUpCheck = await db.query(
          `SELECT id, visit_status FROM followup_visits 
           WHERE child_patient_id = $1 
           AND DATE(visit_date) = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [patientIdInt, today]
        );
        
        let followUpId;
        if (followUpCheck.rows.length > 0) {
          // Mark the existing follow-up visit as completed
          followUpId = followUpCheck.rows[0].id;
          if (followUpCheck.rows[0].visit_status !== 'completed') {
            await db.query(
              `UPDATE followup_visits 
               SET visit_status = 'completed', updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [followUpId]
            );
            console.log(`[markVisitCompleted] Child patient ${patientIdInt} follow-up visit ${followUpId} marked as completed`);
          } else {
            console.log(`[markVisitCompleted] Child patient ${patientIdInt} follow-up visit ${followUpId} already completed`);
          }
        } else {
          // No follow-up visit exists - create one with 'completed' status
          // This ensures visit_status is available for filtering
          // Note: filled_by is required, use the current user or system
          const currentUserId = req.user?.id || null;
          const createResult = await db.query(
            `INSERT INTO followup_visits 
             (child_patient_id, visit_date, visit_status, clinical_assessment, filled_by, created_at, updated_at)
             VALUES ($1, $2, 'completed', 'Marked as completed', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, visit_status`,
            [patientIdInt, today, currentUserId]
          );
          
          if (createResult.rows.length > 0) {
            followUpId = createResult.rows[0].id;
            console.log(`[markVisitCompleted] Created completed follow-up visit ${followUpId} for child patient ${patientIdInt}`);
          }
        }
        
        // Also update the child patient registration timestamp
        const updateResult = await db.query(
          `UPDATE child_patient_registrations 
           SET updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING id, updated_at`,
          [patientIdInt]
        );

        if (updateResult.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Child patient not found'
          });
        }

        console.log(`[markVisitCompleted] Child patient ${patientIdInt} marked as completed`);

        res.json({
          success: true,
          message: 'Child patient visit marked as completed successfully',
          data: { 
            child_patient_id: patientIdInt,
            completed_at: updateResult.rows[0].updated_at
          }
        });
      } else {
        // Handle adult patients - use existing PatientVisit logic
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      
      // Mark today's visit as completed (will create visit record if it doesn't exist)
      const visit = await PatientVisit.markPatientVisitCompletedToday(
        patientIdInt, 
        visit_date,
        patient.assigned_doctor_id || null,
        patient.assigned_room || null
      );

      if (!visit) {
        // Visit exists but is already completed
        return res.status(404).json({
          success: false,
          message: 'Visit for today is already marked as completed'
        });
      }

      res.json({
        success: true,
        message: 'Visit marked as completed successfully',
        data: { visit }
      });
      }
    } catch (error) {
      console.error('[markVisitCompleted] Error:', error);
      
      // Check if it's a "not found" error
      if (error.message && error.message.includes('No visit found')) {
        return res.status(404).json({
          success: false,
          message: error.message || 'No active visit found for today to mark as completed'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to mark visit as completed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async uploadPatientFiles(req, res) {
    try {
      const { id } = req.params;
      const patientIdInt = parseInt(id, 10);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        // Clean up uploaded files if patient doesn't exist
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (err) {
                console.error('Error cleaning up file:', err);
              }
            }
          });
        }
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Get existing files
      const existingFiles = patient.patient_files || [];
      const uploadedFiles = [];

      // Process each uploaded file using PatientFileController
      // This ensures files are saved using the configurable path system
      const PatientFileController = require('./patientFileController');
      const fileCreateReq = {
        body: { patient_id: patientIdInt, user_id: req.user?.id },
        files: req.files,
        user: req.user
      };
      
      const fileCreateRes = {
        status: (code) => ({
          json: (data) => {
            if (code >= 400) {
              throw new Error(data.message || 'Failed to upload files');
            }
          }
        })
      };
      
      await PatientFileController.createPatientFiles(fileCreateReq, fileCreateRes);
      
      // Get updated file list
      const updatedPatientFile = await PatientFile.findByPatientId(patientIdInt);
      const allFiles = updatedPatientFile ? updatedPatientFile.attachment : [];
      
      // Format files for response
      req.files.forEach((file, index) => {
        if (allFiles[index]) {
          uploadedFiles.push({
            filename: path.basename(allFiles[index]),
            originalname: file.originalname,
            path: allFiles[index],
            type: file.mimetype,
            size: file.size,
            uploaded_at: new Date().toISOString()
          });
        }
      });

      // Files are already saved by PatientFileController, no need to update patient_files column
      // The patient_files column is legacy, files are now stored in patient_files table

      res.status(200).json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: {
          files: uploadedFiles,
          total_files: updatedFiles.length
        }
      });
    } catch (error) {
      console.error('Upload patient files error:', error);
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error('Error deleting file:', unlinkError);
            }
          }
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getPatientFiles(req, res) {
    try {
      const { id } = req.params;
      const patientIdInt = parseInt(id, 10);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Use the new PatientFileController to get files from patient_files table
      const PatientFileController = require('./patientFileController');
      const fileReq = {
        params: { patient_id: patientIdInt },
        user: req.user
      };
      
      // Call PatientFileController.getPatientFiles
      const PatientFile = require('../models/PatientFile');
      const patientFile = await PatientFile.findByPatientId(patientIdInt);
      
      const files = patientFile ? patientFile.attachment : [];
      
      // Also include legacy files from patient.patient_files for backward compatibility
      const legacyFiles = patient.patient_files || [];
      const allFiles = [...files, ...legacyFiles];

      res.status(200).json({
        success: true,
        data: {
          files: allFiles,
          count: allFiles.length
        }
      });
    } catch (error) {
      console.error('Get patient files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async deletePatientFile(req, res) {
    try {
      const { id, filename } = req.params;
      const patientIdInt = parseInt(id, 10);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const files = patient.patient_files || [];
      const fileIndex = files.findIndex(f => f.filename === filename);

      if (fileIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Delete physical file
      const uploadsDir = uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error('Error deleting physical file:', unlinkError);
          // Continue even if physical file deletion fails
        }
      }

      // Remove from database
      const updatedFiles = files.filter(f => f.filename !== filename);
      await Patient.updateFiles(patientIdInt, updatedFiles);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
        data: {
          deleted_file: files[fileIndex],
          remaining_files: updatedFiles.length
        }
      });
    } catch (error) {
      console.error('Delete patient file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Change patient's assigned room
   * This will:
   * 1. Update patient's assigned_room
   * 2. Update today's visit record with new room
   * 3. Update assigned_doctor based on new room's doctor
   * 4. Remove patient from old doctor's list (by changing room/doctor assignment)
   * 5. Add patient to new doctor's list
   */
  static async changePatientRoom(req, res) {
    try {
      const { id } = req.params;
      const { new_room } = req.body;
      const patientIdInt = parseInt(id, 10);

      console.log(`[changePatientRoom] Request to change patient ${id} to room "${new_room}"`);

      // Validate patient ID
      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Validate new_room
      if (!new_room || String(new_room).trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'New room is required',
          code: 'ROOM_REQUIRED'
        });
      }

      const newRoomTrimmed = String(new_room).trim();

      // Find the patient
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const oldRoom = patient.assigned_room;
      const oldDoctorId = patient.assigned_doctor_id;
      const oldDoctorName = patient.assigned_doctor_name;

      console.log(`[changePatientRoom] Patient ${patientIdInt} current room: "${oldRoom}", current doctor: ${oldDoctorId} (${oldDoctorName})`);

      // Check if the room is actually changing
      if (oldRoom === newRoomTrimmed) {
        return res.status(200).json({
          success: true,
          message: 'Patient is already in this room',
          data: {
            patient: patient.toJSON(),
            room_changed: false,
            old_room: oldRoom,
            new_room: newRoomTrimmed
          }
        });
      }

      const db = require('../config/database');

      // Get today's date using database CURRENT_DATE for IST consistency
      const todayResult = await db.query('SELECT CURRENT_DATE as today');
      const todayDate = todayResult.rows[0]?.today || new Date().toISOString().slice(0, 10);

      // Find the doctor assigned to the new room for today
      const newRoomDoctorResult = await db.query(
        `SELECT id, name, role 
         FROM users 
         WHERE current_room = $1 
           AND DATE(room_assignment_time) = $2
         LIMIT 1`,
        [newRoomTrimmed, todayDate]
      );

      let newDoctorId = null;
      let newDoctorName = null;
      let newDoctorRole = null;

      if (newRoomDoctorResult.rows.length > 0) {
        const newDoctor = newRoomDoctorResult.rows[0];
        newDoctorId = newDoctor.id;
        newDoctorName = newDoctor.name;
        newDoctorRole = newDoctor.role;
        console.log(`[changePatientRoom] Found doctor ${newDoctorId} (${newDoctorName}) in room ${newRoomTrimmed}`);
      } else {
        console.log(`[changePatientRoom] No doctor currently assigned to room ${newRoomTrimmed}`);
      }

      // Update patient record with new room and doctor
      const updatePatientResult = await db.query(
        `UPDATE registered_patient 
         SET assigned_room = $1,
             assigned_doctor_id = $2,
             assigned_doctor_name = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [newRoomTrimmed, newDoctorId, newDoctorName, patientIdInt]
      );

      if (updatePatientResult.rows.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update patient room'
        });
      }

      console.log(`[changePatientRoom] Updated patient ${patientIdInt} assigned_room to "${newRoomTrimmed}", doctor to ${newDoctorId}`);

      // Update today's visit record with the new room and doctor
      const updateVisitResult = await db.query(
        `UPDATE patient_visits 
         SET room_no = $1,
             assigned_doctor_id = $2,
             notes = COALESCE(notes, '') || $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $3 AND DATE(visit_date) = $4
         RETURNING *`,
        [
          newRoomTrimmed, 
          newDoctorId, 
          patientIdInt, 
          todayDate,
          `\n[Room changed from "${oldRoom}" to "${newRoomTrimmed}" by ${req.user?.name || 'Unknown'} at ${new Date().toISOString()}]`
        ]
      );

      if (updateVisitResult.rows.length > 0) {
        console.log(`[changePatientRoom] Updated today's visit record for patient ${patientIdInt}`);
      } else {
        // No visit record for today - create one
        console.log(`[changePatientRoom] No visit record for today, creating one...`);
        
        // Check if this is first visit or follow-up
        const visitCountResult = await db.query(
          `SELECT COUNT(*) as count FROM patient_visits WHERE patient_id = $1`,
          [patientIdInt]
        );
        const visitCount = parseInt(visitCountResult.rows[0]?.count || 0, 10);
        const visitType = visitCount === 0 ? 'first_visit' : 'follow_up';

        await db.query(
          `INSERT INTO patient_visits 
           (patient_id, visit_date, visit_type, has_file, assigned_doctor_id, room_no, visit_status, notes)
           VALUES ($1, $2, $3, false, $4, $5, 'scheduled', $6)`,
          [
            patientIdInt,
            todayDate,
            visitType,
            newDoctorId,
            newRoomTrimmed,
            `Room assigned to ${newRoomTrimmed} by ${req.user?.name || 'Unknown'} at ${new Date().toISOString()}`
          ]
        );
        console.log(`[changePatientRoom] Created new visit record for patient ${patientIdInt}`);
      }

      // Fetch the updated patient with joined data
      const updatedPatient = await Patient.findById(patientIdInt);

      console.log(`[changePatientRoom] ✅ Successfully changed patient ${patientIdInt} room from "${oldRoom}" to "${newRoomTrimmed}"`);
      console.log(`[changePatientRoom] Doctor changed from ${oldDoctorId} (${oldDoctorName}) to ${newDoctorId} (${newDoctorName})`);

      res.status(200).json({
        success: true,
        message: `Patient room changed from "${oldRoom || 'None'}" to "${newRoomTrimmed}"${newDoctorName ? `. Now assigned to Dr. ${newDoctorName}` : ''}`,
        data: {
          patient: updatedPatient.toJSON(),
          room_changed: true,
          old_room: oldRoom,
          new_room: newRoomTrimmed,
          old_doctor_id: oldDoctorId,
          old_doctor_name: oldDoctorName,
          new_doctor_id: newDoctorId,
          new_doctor_name: newDoctorName,
          new_doctor_role: newDoctorRole
        }
      });
    } catch (error) {
      console.error('[changePatientRoom] Error:', error);
      console.error('[changePatientRoom] Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to change patient room',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = PatientController;
