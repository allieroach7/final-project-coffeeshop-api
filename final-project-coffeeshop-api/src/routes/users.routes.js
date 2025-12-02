// src/routes/users.routes.js
import express from 'express';
import { getAllUsers, getUser, updateUser, deleteUser } from '../controllers/users.controller.js';
import { authenticate, authorizeRoles, ownershipOrRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List all users (staff only)
router.get('/', authenticate, authorizeRoles('barista', 'admin'), getAllUsers);

// GET /api/users/:id - Get specific user
router.get('/:id', authenticate, ownershipOrRole(async (req) => Number(req.params.id), 'admin', 'barista'), getUser);

// PUT /api/users/:id - Update user
router.put('/:id', authenticate, ownershipOrRole(async (req) => Number(req.params.id), 'admin'), updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteUser);

export default router;
