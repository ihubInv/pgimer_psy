const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Faculty', 'Resident', 'Psychiatric Welfare Officer'),
  DashboardController.getDashboard,
);

module.exports = router;
