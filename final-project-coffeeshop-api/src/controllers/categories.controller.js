// src/controllers/categories.controller.js
import prisma from '../db.js';

export async function listCategories(req, res) {
  const cats = await prisma.category.findMany({ include: { menuItems: { select: { id: true, name: true, price: true } } }});
  res.json(cats);
}

export async function getCategory(req, res) {
  const id = Number(req.params.id);
  const cat = await prisma.category.findUnique({ where: { id }, include: { menuItems: true }});
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json(cat);
}

export async function createCategory(req, res) {
  const { name, description } = req.body;
  const cat = await prisma.category.create({ data: { name, description }});
  res.status(201).json(cat);
}

export async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const updated = await prisma.category.update({ where: { id }, data: req.body });
  res.json(updated);
}

export async function deleteCategory(req, res) {
  const id = Number(req.params.id);
  await prisma.category.delete({ where: { id }});
  res.status(204).send();
}
