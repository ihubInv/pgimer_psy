const express = require('express');
const router = express.Router();
const ChildCapWorkupController = require('../controllers/childCapWorkupController');
const { authenticateToken, authorizeRoles, requireAdmin } = require('../middleware/auth');

// Get all workup records for a child patient
router.get(
  '/child-patient/:child_patient_id',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  ChildCapWorkupController.getByChildPatientId
);

// Get single workup record by ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  ChildCapWorkupController.getById
);

// Create new workup record
router.post(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  ChildCapWorkupController.create
);

// Update workup record
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  ChildCapWorkupController.update
);

// Delete workup record (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  ChildCapWorkupController.delete
);

module.exports = router;
