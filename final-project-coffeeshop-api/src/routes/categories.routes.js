// src/routes/categories.routes.js
import express from 'express';
import { listCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/categories.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
const router = express.Router();

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, authorizeRoles('admin'), createCategory);
router.put('/:id', authenticate, authorizeRoles('admin'), updateCategory);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCategory);

export default router;
