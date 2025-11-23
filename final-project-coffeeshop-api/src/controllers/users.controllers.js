// src/controllers/users.controller.js
import prisma from '../db.js';
import bcrypt from 'bcryptjs';

export async function getAllUsers(req, res) {
  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true, created_at: true }});
  res.json(users);
}

export async function getUser(req, res) {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, role: true, created_at: true }});
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}

export async function updateUser(req, res) {
  const id = Number(req.params.id);
  const { username, email, password, role } = req.body;
  const data = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (typeof role !== 'undefined') data.role = role;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    data.password_hash = await bcrypt.hash(password, salt);
  }
  try {
    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, username: true, email: true, role: true, created_at: true }});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
}

export async function deleteUser(req, res) {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id }});
  res.status(204).send();
}
