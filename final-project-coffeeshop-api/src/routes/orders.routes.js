// src/routes/orders.routes.js - CORRECTED VERSION
import express from 'express';
import { createOrder, listOrders, getOrder, updateOrderStatus, deleteOrder } from '../controllers/orders.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrder);
router.put('/:id/status', authenticate, authorizeRoles('barista', 'admin'), updateOrderStatus);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteOrder); // ✅ Added deleteOrder controller

export default router;