const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/roomController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - room_number
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated room ID
 *         room_number:
 *           type: string
 *           description: Unique room number/identifier
 *         room_name:
 *           type: string
 *           description: Optional room name
 *         description:
 *           type: string
 *           description: Room description
 *         capacity:
 *           type: integer
 *           description: Room capacity (default: 1)
 *         is_active:
 *           type: boolean
 *           description: Whether room is active
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms with pagination
 *     tags: [Room Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by room number or name
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 */
// Allow Faculty and Resident to read rooms for room change feature
router.get('/', authenticateToken, authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'), RoomController.getAllRooms);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Room Management]
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
 *         description: Room retrieved successfully
 *       404:
 *         description: Room not found
 */
router.get('/:id', authenticateToken, authorizeRoles('Admin', 'Psychiatric Welfare Officer'), validateId, RoomController.getRoomById);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create new room
 *     tags: [Room Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room_number
 *             properties:
 *               room_number:
 *                 type: string
 *               room_name:
 *                 type: string
 *               description:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Room created successfully
 *       409:
 *         description: Room number already exists
 */
router.post('/', authenticateToken, authorizeRoles('Admin', 'Psychiatric Welfare Officer'), RoomController.createRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update room
 *     tags: [Room Management]
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
 *               room_number:
 *                 type: string
 *               room_name:
 *                 type: string
 *               description:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       404:
 *         description: Room not found
 */
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Psychiatric Welfare Officer'), validateId, RoomController.updateRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete room (soft delete)
 *     tags: [Room Management]
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
 *         description: Room deleted successfully
 *       404:
 *         description: Room not found
 */
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Psychiatric Welfare Officer'), validateId, RoomController.deleteRoom);

module.exports = router;

