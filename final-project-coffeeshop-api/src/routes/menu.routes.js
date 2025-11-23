// src/routes/menu.routes.js
import express from 'express';
import { listMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
const router = express.Router();

router.get('/items', listMenuItems);
router.get('/items/:id', getMenuItem);
router.post('/items', authenticate, authorizeRoles('barista', 'admin'), createMenuItem);
router.put('/items/:id', authenticate, authorizeRoles('barista', 'admin'), updateMenuItem);
router.delete('/items/:id', authenticate, authorizeRoles('admin'), deleteMenuItem);

export default router;
