const express = require('express');
const router = express.Router();
const FollowUpController = require('../controllers/followUpController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     FollowUp:
 *       type: object
 *       required:
 *         - patient_id
 *         - visit_date
 *         - clinical_assessment
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated follow-up ID
 *         patient_id:
 *           type: integer
 *           description: Patient ID
 *         visit_id:
 *           type: integer
 *           description: Reference to patient_visits table
 *         visit_date:
 *           type: string
 *           format: date
 *           description: Visit date
 *         clinical_assessment:
 *           type: string
 *           description: Follow-up clinical assessment notes
 *         filled_by:
 *           type: integer
 *           description: User ID who filled the follow-up
 *         assigned_doctor_id:
 *           type: integer
 *           description: Doctor assigned to the patient
 *         room_no:
 *           type: string
 *           description: Room number
 */

/**
 * @swagger
 * /api/follow-ups:
 *   post:
 *     summary: Create a new follow-up visit
 *     tags: [Follow-Up Visits]
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
 *               - clinical_assessment
 *             properties:
 *               patient_id:
 *                 type: integer
 *               visit_date:
 *                 type: string
 *                 format: date
 *               clinical_assessment:
 *                 type: string
 *               assigned_doctor_id:
 *                 type: integer
 *               room_no:
 *                 type: string
 *     responses:
 *       201:
 *         description: Follow-up visit created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  FollowUpController.createFollowUp
);

/**
 * @swagger
 * /api/follow-ups/{id}:
 *   get:
 *     summary: Get follow-up visit by ID
 *     tags: [Follow-Up Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Follow-up visit retrieved successfully
 *       404:
 *         description: Follow-up visit not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  FollowUpController.getFollowUpById
);

/**
 * @swagger
 * /api/follow-ups/patient/{patient_id}:
 *   get:
 *     summary: Get all follow-up visits for a patient
 *     tags: [Follow-Up Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patient_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Follow-up visits retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/patient/:patient_id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  FollowUpController.getFollowUpsByPatientId
);

/**
 * @swagger
 * /api/follow-ups/{id}:
 *   put:
 *     summary: Update follow-up visit
 *     tags: [Follow-Up Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visit_date:
 *                 type: string
 *                 format: date
 *               clinical_assessment:
 *                 type: string
 *               assigned_doctor_id:
 *                 type: integer
 *               room_no:
 *                 type: string
 *     responses:
 *       200:
 *         description: Follow-up visit updated successfully
 *       404:
 *         description: Follow-up visit not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  FollowUpController.updateFollowUp
);

/**
 * @swagger
 * /api/follow-ups/{id}:
 *   delete:
 *     summary: Delete follow-up visit (soft delete)
 *     tags: [Follow-Up Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Follow-up visit deleted successfully
 *       404:
 *         description: Follow-up visit not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  FollowUpController.deleteFollowUp
);

module.exports = router;



