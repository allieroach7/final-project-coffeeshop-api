// src/controllers/menu.controller.js
import prisma from '../db.js';

export async function listMenuItems(req, res) {
  const items = await prisma.menuItem.findMany({
    include: { category: true },
    where: {},
  });
  res.json(items);
}

export async function getMenuItem(req, res) {
  const id = Number(req.params.id);
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { category: true }});
  if (!item) return res.status(404).json({ message: 'Menu item not found' });
  res.json(item);
}

export async function createMenuItem(req, res) {
  const { name, description, price, category_id, is_available } = req.body;
  const item = await prisma.menuItem.create({
    data: { name, description, price: Number(price), category_id: Number(category_id), is_available: is_available ?? true },
  });
  res.status(201).json(item);
}

export async function updateMenuItem(req, res) {
  const id = Number(req.params.id);
  const payload = req.body;
  if (payload.price) payload.price = Number(payload.price);
  const updated = await prisma.menuItem.update({ where: { id }, data: payload });
  res.json(updated);
}

export async function deleteMenuItem(req, res) {
  // soft-delete pattern: set is_available false (as per your doc). We'll support both.
  const id = Number(req.params.id);
  await prisma.menuItem.update({ where: { id }, data: { is_available: false }});
  res.status(204).send();
}
