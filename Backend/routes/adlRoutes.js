const express = require('express');
const router = express.Router();
const ADLController = require('../controllers/adlController');
const {
  authenticateToken,
  requireDoctor,
  requireAdmin,
  requireIntakeRecordWriter,
} = require('../middleware/auth');
const {
  validateId,
  validatePagination
} = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     ADLFile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ADL file ID
 *         patient_id:
 *           type: integer
 *           description: Patient ID
 *         adl_no:
 *           type: string
 *           description: Unique ADL file number
 *         created_by:
 *           type: integer
 *           description: Doctor user ID who created the file
 *         clinical_proforma_id:
 *           type: integer
 *           description: Clinical proforma ID that triggered ADL creation
 *         file_status:
 *           type: string
 *           enum: [created, stored, retrieved, active, archived]
 *           description: Current file status
 *         physical_file_location:
 *           type: string
 *           maxLength: 100
 *           description: Physical location of the file
 *         file_created_date:
 *           type: string
 *           format: date
 *           description: Date when file was created
 *         last_accessed_date:
 *           type: string
 *           format: date
 *           description: Last date file was accessed
 *         last_accessed_by:
 *           type: integer
 *           description: User ID who last accessed the file
 *         total_visits:
 *           type: integer
 *           description: Total number of visits/accesses
 *         is_active:
 *           type: boolean
 *           description: Whether file is active
 *         notes:
 *           type: string
 *           description: Additional notes about the file
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         patient_name:
 *           type: string
 *           description: Patient name (from join)
 *         cr_no:
 *           type: string
 *           description: CR number (from join)
 *         psy_no:
 *           type: string
 *           description: PSY number (from join)
 *         created_by_name:
 *           type: string
 *           description: Doctor name who created file (from join)
 *         created_by_role:
 *           type: string
 *           description: Doctor role (from join)
 *         last_accessed_by_name:
 *           type: string
 *           description: Name of user who last accessed file (from join)
 *         assigned_doctor:
 *           type: integer
 *           description: Assigned doctor ID (from clinical_proforma join)
 *         assigned_doctor_name:
 *           type: string
 *           description: Assigned doctor name (from clinical_proforma join)
 *         assigned_doctor_role:
 *           type: string
 *           description: Assigned doctor role (from clinical_proforma join)
 *         proforma_visit_date:
 *           type: string
 *           format: date
 *           description: Visit date from clinical proforma (from join)
 *         # Complex Case Data Fields (stored in ADL file, not in clinical_proforma)
 *         # History of Present Illness - Expanded
 *         history_present_illness:
 *           type: string
 *         history_treatment_drugs:
 *           type: string
 *         history_treatment_response:
 *           type: string
 *         # Multiple Informants (JSON array)
 *         informants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               relationship:
 *                 type: string
 *               name:
 *                 type: string
 *               reliability:
 *                 type: string
 *               age:
 *                 type: string
 *               sex:
 *                 type: string
 *               education:
 *                 type: string
 *               marital_status:
 *                 type: string
 *               occupation:
 *                 type: string
 *               city_district:
 *                 type: string
 *                 description: Name of the city or district
 *         # Complaints and Duration (JSON arrays)
 *         complaints_patient:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               complaint:
 *                 type: string
 *               duration:
 *                 type: string
 *         complaints_informant:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               complaint:
 *                 type: string
 *               duration:
 *                 type: string
 *         # Past History - Detailed
 *         past_history_medical:
 *           type: string
 *         past_history_psychiatric:
 *           type: string
 *         # Family History - Detailed
 *         family_history_father_age:
 *           type: string
 *         family_history_father_education:
 *           type: string
 *         family_history_father_occupation:
 *           type: string
 *         family_history_father_personality:
 *           type: string
 *         family_history_father_deceased:
 *           type: boolean
 *         family_history_father_death_age:
 *           type: string
 *         family_history_father_death_date:
 *           type: string
 *           format: date
 *         family_history_father_death_cause:
 *           type: string
 *         family_history_mother_age:
 *           type: string
 *         family_history_mother_education:
 *           type: string
 *         family_history_mother_occupation:
 *           type: string
 *         family_history_mother_personality:
 *           type: string
 *         family_history_mother_deceased:
 *           type: boolean
 *         family_history_mother_death_age:
 *           type: string
 *         family_history_mother_death_date:
 *           type: string
 *           format: date
 *         family_history_mother_death_cause:
 *           type: string
 *         family_history_siblings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               age:
 *                 type: string
 *               sex:
 *                 type: string
 *               education:
 *                 type: string
 *               occupation:
 *                 type: string
 *               marital_status:
 *                 type: string
 *         # Diagnostic Formulation
 *         diagnostic_formulation_history:
 *           type: string
 *         # Premorbid Personality
 *         premorbid_personality_history:
 *           type: string
 *         # Physical Examination - Comprehensive
 *         physical_appearance:
 *           type: string
 *         physical_body_build:
 *           type: string
 *         physical_pallor:
 *           type: boolean
 *         physical_icterus:
 *           type: boolean
 *         physical_oedema:
 *           type: boolean
 *         physical_lymphadenopathy:
 *           type: boolean
 *         physical_pulse:
 *           type: string
 *         physical_bp:
 *           type: string
 *         physical_height:
 *           type: string
 *         physical_weight:
 *           type: string
 *         physical_waist:
 *           type: string
 *         physical_fundus:
 *           type: string
 *         physical_cvs_examination:
 *           type: string
 *         physical_chest_examination:
 *           type: string
 *         physical_abdomen_examination:
 *           type: string
 *         physical_cns_cranial:
 *           type: string
 *         physical_cns_motor_sensory:
 *           type: string
 *         physical_cns_rigidity:
 *           type: string
 *         physical_cns_involuntary:
 *           type: string
 *         physical_cns_superficial_reflexes:
 *           type: string
 *         physical_cns_dtrs:
 *           type: string
 *         physical_cns_plantar:
 *           type: string
 *         physical_cns_cerebellar:
 *           type: string
 *         # Mental Status Examination - Expanded
 *         mse_general_examination:
 *           type: string
 *         mse_psychomotor_examination:
 *           type: string
 *         mse_affect_examination:
 *           type: string
 *         mse_thought_flow:
 *           type: string
 *         mse_thought_form:
 *           type: string
 *         mse_thought_content:
 *           type: string
 *         mse_thought_possession:
 *           type: string
 *         mse_thought_perception:
 *           type: string
 *         mse_cognitive_consciousness:
 *           type: string
 *         mse_cognitive_orientation_time:
 *           type: string
 *         mse_cognitive_orientation_place:
 *           type: string
 *         mse_cognitive_orientation_person:
 *           type: string
 *         mse_cognitive_memory_immediate:
 *           type: string
 *         mse_cognitive_memory_recent:
 *           type: string
 *         mse_cognitive_memory_remote:
 *           type: string
 *         mse_cognitive_subtraction:
 *           type: string
 *         mse_cognitive_digit_span:
 *           type: string
 *         mse_cognitive_counting:
 *           type: string
 *         mse_cognitive_general_knowledge:
 *           type: string
 *         mse_cognitive_calculation:
 *           type: string
 *         mse_cognitive_similarities:
 *           type: string
 *         mse_cognitive_proverbs:
 *           type: string
 *         mse_insight_examination:
 *           type: string
 *         # Educational History
 *         education_history:
 *           type: string
 *           description: Age at start, highest class, performance, disciplinary problems, peer relationships, hobbies, special abilities, reason for discontinuing
 *         occupation_history:
 *           type: string
 *           description: Job title, dates, adjustment, difficulties, promotions, reason for change
 *         # Sexual and Marital History
 *         sexual_menarche_age:
 *           type: string
 *         sexual_menarche_reaction:
 *           type: string
 *         sexual_education:
 *           type: string
 *         sexual_masturbation:
 *           type: string
 *         sexual_contact:
 *           type: string
 *         sexual_premarital_extramarital:
 *           type: string
 *         sexual_marriage_arranged:
 *           type: string
 *         sexual_marriage_details:
 *           type: string
 *           description: Spouse age, spouse occupation, general adjustment, sexual adjustment, sexual problems
 *         sexual_children:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               age:
 *                 type: string
 *               sex:
 *                 type: string
 *         # Religion
 *         religion_history:
 *           type: string
 *           description: Type of religion, participation in religious activities, changes in religious beliefs
 *         living_situation_history:
 *           type: string
 *           description: Income sharing arrangements, expenses, kitchen arrangements, domestic conflicts, social class
 *         # General Home Situation and Early Development
 *         general_home_situation:
 *           type: string
 *           description: Childhood home, parents relationship, socioeconomic status, interpersonal relationships
 *         personal_birth_date:
 *           type: string
 *           format: date
 *         personal_birth_place:
 *           type: string
 *         personal_delivery_type:
 *           type: string
 *         personal_complications_prenatal:
 *           type: string
 *         personal_complications_natal:
 *           type: string
 *         personal_complications_postnatal:
 *           type: string
 *         development_history:
 *           type: string
 *           description: Weaning age, first words, three-word sentences, walking, neurotic traits, nail biting, bedwetting, phobias, childhood illness
 *         # Final Assessment
 *         final_assessment_history:
 *           type: string
 *     
 *     ADLFileUpdate:
 *       type: object
 *       description: All fields that can be updated in ADL file, including all complex case data fields
 *       properties:
 *         file_status:
 *           type: string
 *           enum: [created, stored, retrieved, active, archived]
 *         physical_file_location:
 *           type: string
 *         last_accessed_date:
 *           type: string
 *           format: date
 *         last_accessed_by:
 *           type: integer
 *         total_visits:
 *           type: integer
 *         is_active:
 *           type: boolean
 *         notes:
 *           type: string
 *         clinical_proforma_id:
 *           type: integer
 *           description: Link to clinical proforma for complex cases
 *         # All complex case fields are also updatable (same as listed in ADLFile schema above)
 *     
 *     BulkFileOperation:
 *       type: object
 *       required:
 *         - file_ids
 *       properties:
 *         file_ids:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of ADL file IDs
 */

// Protected routes (Doctor and Admin)
/**
 * @swagger
 * /api/adl-files:
 *   get:
 *     summary: Get all ADL files with pagination and filters
 *     description: |
 *       By default, returns only ADL files associated with complex cases (where `clinical_proforma_id` IS NOT NULL and `doctor_decision` = 'complex_case').
 *       Set `include_all=true` to fetch all ADL files regardless of complex case association.
 *       
 *       **Note:** ADL files for complex cases contain comprehensive patient data stored in the `adl_files` table.
 *       These files are automatically created when a Walk-in Clinical Proforma is created with `doctor_decision` = 'complex_case'.
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of files per page
 *       - in: query
 *         name: include_all
 *         schema:
 *           type: boolean
 *         description: If true, returns all ADL files. If false or omitted, returns only complex case ADL files.
 *       - in: query
 *         name: file_status
 *         schema:
 *           type: string
 *           enum: [created, stored, retrieved, active, archived]
 *         description: Filter by file status
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: created_by
 *         schema:
 *           type: integer
 *         description: Filter by creator
 *       - in: query
 *         name: last_accessed_by
 *         schema:
 *           type: integer
 *         description: Filter by last accessed user
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: ADL files retrieved successfully with patient and doctor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           patient_name:
 *                             type: string
 *                             description: Patient name from patients table join
 *                           cr_no:
 *                             type: string
 *                             description: CR number from patients table join
 *                           assigned_doctor_name:
 *                             type: string
 *                             description: Assigned doctor name from clinical_proforma join
 *                           assigned_doctor_role:
 *                             type: string
 *                             description: Assigned doctor role
 *                           proforma_visit_date:
 *                             type: string
 *                             format: date
 *                             description: Visit date from clinical proforma
 *                           clinical_proforma_id:
 *                             type: integer
 *                             description: Link to clinical proforma for complex cases
 *                           file_created_date:
 *                             type: string
 *                             format: date
 *                             description: ADL file creation date
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, validatePagination, ADLController.getAllADLFiles);

/**
 * @swagger
 * /api/adl-files:
 *   post:
 *     summary: Create a new ADL file
 *     description: |
 *       Creates a new ADL file with comprehensive patient data for complex cases.
 *       All fields from ADL_FILE_FORM schema can be included in the request body.
 *       The ADL number will be auto-generated if not provided.
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *             properties:
 *               patient_id:
 *                 type: integer
 *                 description: Patient ID (required)
 *               clinical_proforma_id:
 *                 type: integer
 *                 description: Clinical proforma ID (optional)
 *               adl_no:
 *                 type: string
 *                 description: ADL number (auto-generated if not provided)
 *               file_status:
 *                 type: string
 *                 enum: [created, stored, retrieved, active, archived]
 *                 default: created
 *               # All complex case fields from ADL_FILE_FORM can be included:
 *               history_present_illness:
 *                 type: string
 *               informants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     relationship:
 *                       type: string
 *                     name:
 *                       type: string
 *                     reliability:
 *                       type: string
 *               complaints_patient:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     complaint:
 *                       type: string
 *                     duration:
 *                       type: string
 *               # ... (all other ADL_FILE_FORM fields can be included)
 *     responses:
 *       201:
 *         description: ADL file created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     adl_file:
 *                       $ref: '#/components/schemas/ADLFile'
 *       400:
 *         description: Bad request (missing required fields)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, requireIntakeRecordWriter, ADLController.createADLFile);

/**
 * @swagger
 * /api/adl-files/stats:
 *   get:
 *     summary: Get ADL file statistics
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticateToken, requireAdmin, ADLController.getADLStats);

/**
 * @swagger
 * /api/adl-files/status-stats:
 *   get:
 *     summary: Get files by status statistics
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/status-stats', authenticateToken, ADLController.getFilesByStatus);

/**
 * @swagger
 * /api/adl-files/active:
 *   get:
 *     summary: Get active files (currently retrieved)
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active files retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/active', authenticateToken, ADLController.getActiveFiles);

// Endpoint not used in frontend - Swagger docs removed
router.post('/bulk-retrieve', authenticateToken, ADLController.bulkRetrieveFiles);

// Endpoint not used in frontend - Swagger docs removed
router.post('/bulk-return', authenticateToken, ADLController.bulkReturnFiles);

/**
 * @swagger
 * /api/adl-files/{id}:
 *   get:
 *     summary: Get ADL file by ID
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ADL file ID
 *     responses:
 *       200:
 *         description: ADL file retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: ADL file not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateToken, validateId, ADLController.getADLFileById);

/**
 * @swagger
 * /api/adl-files/{id}:
 *   put:
 *     summary: Update ADL file
 *     description: |
 *       Updates ADL file fields including all complex case data fields.
 *       This endpoint can be used to update comprehensive patient data stored in the ADL file for complex cases.
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ADL file ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ADLFileUpdate'
 *           description: |
 *             All complex case fields (history_*, informants, complaints_*, past_history_*, family_history_*,
 *             diagnostic_formulation_*, premorbid_personality_*, physical_*, mse_*, education_*, occupation_history,
 *             sexual_*, religion_*, living_*, general_home_situation, personal_*, development_*, provisional_diagnosis,
 *             treatment_plan, consultant_comments) can be included in the update request.
 *     responses:
 *       200:
 *         description: ADL file updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: ADL file not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateToken, requireIntakeRecordWriter, validateId, ADLController.updateADLFile);

/**
 * @swagger
 * /api/adl-files/{id}:
 *   delete:
 *     summary: Delete ADL file (soft delete by archiving)
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ADL file ID
 *     responses:
 *       200:
 *         description: ADL file deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: ADL file not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateToken, validateId, ADLController.deleteADLFile);

/**
 * @swagger
 * /api/adl-files/patient/{patient_id}:
 *   get:
 *     summary: Get ADL files by patient ID
 *     tags: [Out Patient Intake Record]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patient_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: ADL files retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/patient/:patient_id', authenticateToken, ADLController.getADLFilesByPatientId);
router.get('/child-patient/:child_patient_id', authenticateToken, ADLController.getADLFilesByChildPatientId);

module.exports = router;
