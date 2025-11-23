// src/routes/orders.routes.js
import express from 'express';
import { createOrder, listOrders, getOrder, updateOrderStatus, deleteOrder } from '../controllers/orders.controller.js';
import { authenticate, authorizeRoles, ownershipOrRole } from '../middleware/auth.js';
const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrder);
router.put('/:id/status', authenticate, authorizeRoles('barista', 'admin'), updateOrderStatus);
router.delete('/:id', authenticate, ownershipOrRole(async (req) => {
  const id = Number(req.params.id);
  // fetch owner id
  // dynamic get inside closure: use prisma
  const { default: prisma } = await import('../db.js');
  const record = await prisma.order.findUnique({ where: { id }});
  return record?.user_id;
}, 'admin'));

export default router;
