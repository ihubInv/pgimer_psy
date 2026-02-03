// routes/childClinicalProformaRoutes.js
const express = require('express');
const router = express.Router();
const ChildClinicalProformaController = require('../controllers/childClinicalProformaController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validatePagination, validateId, validateChildPatientId } = require('../middleware/validation');

// Create child clinical proforma
router.post(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  ChildClinicalProformaController.createChildClinicalProforma
);

// Get all child clinical proformas with pagination
router.get(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident', 'Psychiatric Welfare Officer'),
  validatePagination,
  ChildClinicalProformaController.getAllChildClinicalProformas
);

// Get child clinical proforma by ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident', 'Psychiatric Welfare Officer'),
  validateId,
  ChildClinicalProformaController.getChildClinicalProformaById
);

// Get child clinical proformas by child patient ID
router.get(
  '/child-patient/:child_patient_id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident', 'Psychiatric Welfare Officer'),
  validateChildPatientId,
  ChildClinicalProformaController.getChildClinicalProformasByChildPatientId
);

// Update child clinical proforma
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  validateId,
  ChildClinicalProformaController.updateChildClinicalProforma
);

// Delete child clinical proforma
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident'),
  validateId,
  ChildClinicalProformaController.deleteChildClinicalProforma
);

module.exports = router;
