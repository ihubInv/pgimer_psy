const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Medicine:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         category:
 *           type: string
 *           enum: [antipsychotics, antidepressants, benzodiazepines, mood_stabilizers]
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/medicines:
 *   post:
 *     summary: Create a new medicine
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [antipsychotics, antidepressants, benzodiazepines, mood_stabilizers]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Medicine created successfully
 *       409:
 *         description: Medicine already exists
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['Admin', 'Faculty']),
  [
    body('name').trim().notEmpty().withMessage('Medicine name is required'),
    body('category').isIn(['antipsychotics', 'antidepressants', 'benzodiazepines', 'mood_stabilizers']).withMessage('Invalid category')
  ],
  medicineController.createMedicine
);

/**
 * @swagger
 * /api/medicines:
 *   get:
 *     summary: Get all medicines with pagination and filters
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         - in: query
 *         name: category
 *         schema:
 *           type: string
 *         - in: query
 *         name: search
 *         schema:
 *           type: string
 *         - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Medicines retrieved successfully
 */
router.get(
  '/',
  authenticateToken,
  medicineController.getAllMedicines
);

/**
 * @swagger
 * /api/medicines/categories:
 *   get:
 *     summary: Get all medicine categories
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get(
  '/categories',
  authenticateToken,
  medicineController.getCategories
);

/**
 * @swagger
 * /api/medicines/category/{category}:
 *   get:
 *     summary: Get medicines by category
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicines retrieved successfully
 */
router.get(
  '/category/:category',
  authenticateToken,
  medicineController.getMedicinesByCategory
);

/**
 * @swagger
 * /api/medicines/{id}:
 *   get:
 *     summary: Get medicine by ID
 *     tags: [Medicines]
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
 *         description: Medicine retrieved successfully
 */
router.get(
  '/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('Invalid medicine ID')
  ],
  medicineController.getMedicineById
);

/**
 * @swagger
 * /api/medicines/{id}:
 *   put:
 *     summary: Update medicine
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Medicine updated successfully
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['Admin', 'Faculty']),
  [
    param('id').isInt().withMessage('Invalid medicine ID'),
    body('name').optional().trim().notEmpty().withMessage('Medicine name cannot be empty'),
    body('category').optional().isIn(['antipsychotics', 'antidepressants', 'benzodiazepines', 'mood_stabilizers']).withMessage('Invalid category')
  ],
  medicineController.updateMedicine
);

/**
 * @swagger
 * /api/medicines/{id}:
 *   delete:
 *     summary: Delete medicine (soft delete)
 *     tags: [Medicines]
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
 *         description: Medicine deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['Admin', 'Faculty']),
  [
    param('id').isInt().withMessage('Invalid medicine ID')
  ],
  medicineController.deleteMedicine
);

/**
 * @swagger
 * /api/medicines/bulk-import:
 *   post:
 *     summary: Bulk import medicines from JSON file
 *     tags: [Medicines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Medicines imported successfully
 */
router.post(
  '/bulk-import',
  authenticateToken,
  authorizeRoles(['Admin']),
  medicineController.bulkImportMedicines
);

module.exports = router;

