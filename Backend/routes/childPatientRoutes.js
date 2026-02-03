// routes/childPatientRoutes.js
const express = require('express');
const router = express.Router();
const ChildPatientController = require('../controllers/childPatientController');
const { authenticateToken, authorizeRoles, requireAdmin } = require('../middleware/auth');
const { validatePagination, validateId } = require('../middleware/validation');
const { handleUpload } = require('../middleware/upload');

/**
 * @swagger
 * /api/child-patient/register:
 *   post:
 *     summary: Register a new child patient (CGC)
 *     tags: [Child Patient Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - child_name
 *             properties:
 *               seen_as_walk_in_on:
 *                 type: string
 *                 format: date
 *               cr_number:
 *                 type: string
 *               cgc_number:
 *                 type: string
 *               child_name:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               age_group:
 *                 type: string
 *                 enum: [Less than 1 year, 1 – 5 years, 5 – 10 years, 10 – 15 years]
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Child patient registered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/register',
  authenticateToken,
  authorizeRoles('Psychiatric Welfare Officer', 'Admin'),
  handleUpload,
  ChildPatientController.registerChildPatient
);

/**
 * @swagger
 * /api/child-patient:
 *   get:
 *     summary: Get all child patients with pagination
 *     tags: [Child Patient Registration]
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
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Child patients retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  validatePagination,
  ChildPatientController.getAllChildPatients
);

/**
 * @swagger
 * /api/child-patient/{id}:
 *   get:
 *     summary: Get child patient by ID
 *     tags: [Child Patient Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Child patient ID
 *     responses:
 *       200:
 *         description: Child patient retrieved successfully
 *       404:
 *         description: Child patient not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/child-patient/cr/{cr_number}:
 *   get:
 *     summary: Get child patient by CR number
 *     tags: [Child Patient Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cr_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Central Registration Number
 *     responses:
 *       200:
 *         description: Child patient retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Child patient not found
 *       500:
 *         description: Server error
 */
router.get(
  '/cr/:cr_number',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  ChildPatientController.getChildPatientByCRNo
);

/**
 * @swagger
 * /api/child-patient/add-to-today:
 *   post:
 *     summary: Add child patient to today's list
 *     tags: [Child Patient Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - child_patient_id
 *             properties:
 *               child_patient_id:
 *                 type: integer
 *               assigned_room:
 *                 type: string
 *     responses:
 *       200:
 *         description: Child patient added to today's list successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Child patient not found
 *       500:
 *         description: Server error
 */
router.post(
  '/add-to-today',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  ChildPatientController.addChildPatientToTodayList
);

/**
 * @swagger
 * /api/child-patient/{id}:
 *   delete:
 *     summary: Delete child patient (Admin only)
 *     tags: [Child Patient Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Child patient ID
 *     responses:
 *       200:
 *         description: Child patient deleted successfully
 *       400:
 *         description: Invalid child patient ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Child patient not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateId,
  ChildPatientController.deleteChildPatient
);

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  validateId,
  ChildPatientController.getChildPatientById
);

module.exports = router;
