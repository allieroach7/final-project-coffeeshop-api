// src/routes/users.routes.js
import express from 'express';
import { getAllUsers, getUser, updateUser, deleteUser } from '../controllers/users.controller.js';
import { authenticate, authorizeRoles, ownershipOrRole } from '../middleware/auth.js';
const router = express.Router();

router.get('/', authenticate, authorizeRoles('barista', 'admin')); // list users (staff)
router.get('/:id', authenticate, ownershipOrRole(async (req) => Number(req.params.id), 'admin', 'barista'));
router.put('/:id', authenticate, ownershipOrRole(async (req) => Number(req.params.id), 'admin'));
router.delete('/:id', authenticate, authorizeRoles('admin'));

export default router;
