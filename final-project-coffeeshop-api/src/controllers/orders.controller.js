// src/controllers/orders.controller.js
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../db.js';

export async function createOrder(req, res) {
  // expects items: [{ menuitem_id, quantity }]
  const userId = req.user.id;
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'items required' });

  // Fetch menu items
  const menuItemIds = items.map(i => i.menuitem_id);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } }});
  // compute total and build orderItems
  let total = 0;
  const orderItemsData = items.map(i => {
    const m = menuItems.find(mi => mi.id === i.menuitem_id);
    if (!m) throw new Error(`MenuItem ${i.menuitem_id} not found`);
    const unit_price = Decimal(m.price);
    const quantity = Number(i.quantity);
    total += unit_price * quantity;
    return {
      menuitem_id: i.menuitem_id,
      quantity,
      unit_price,
    };
  });
  const order = await prisma.order.create({
    data: {
      user_id: userId,
      total_price: total,
      orderItems: {
        create: orderItemsData.map(oi => ({
          menuitem_id: oi.menuitem_id,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
        })),
      },
    },
    include: { orderItems: { include: { menuItem: true } } },
  });
  res.status(201).json(order);
}

export async function listOrders(req, res) {
  // admin/barista: list all, customer: list own
  if (req.user.role === 'customer') {
    const orders = await prisma.order.findMany({
      where: { user_id: req.user.id },
      include: { orderItems: { include: { menuItem: true } } },
      orderBy: { order_date: 'desc' },
    });
    return res.json(orders);
  }
  const orders = await prisma.order.findMany({ include: { orderItems: { include: { menuItem: true } }, user: { select: { id: true, username: true } } }, orderBy: { order_date: 'desc' }});
  res.json(orders);
}

export async function getOrder(req, res) {
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where: { id }, include: { orderItems: { include: { menuItem: true } }, user: true }});
  if (!order) return res.status(404).json({ message: 'Order not found' });
  // ownership check
  if (req.user.role === 'customer' && order.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json(order);
}

export async function updateOrderStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;
  const updated = await prisma.order.update({ where: { id }, data: { status }});
  res.json(updated);
}

export async function deleteOrder(req, res) {
  const id = Number(req.params.id);
  // only admin or owner can delete - route will be protected
  await prisma.order.delete({ where: { id }});
  res.status(204).send();
}
