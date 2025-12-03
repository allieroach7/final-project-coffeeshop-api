// src/controllers/orders.controller.js
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../db.js';

export async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    
    console.log('Creating order for user:', userId);
    console.log('Request items:', items);

    // Validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: 'items array is required and must not be empty' 
      });
    }

    // Fetch ALL menu items to see what's available
    const allMenuItems = await prisma.menuItem.findMany({
      select: { id: true, name: true, price: true, is_available: true }
    });
    
    console.log('All menu items in database:', allMenuItems);

    // Get requested IDs
    const requestedIds = items.map(i => i.menuitem_id);
    console.log('Requested menu item IDs:', requestedIds);

    // Find requested items
    const foundItems = allMenuItems.filter(mi => 
      requestedIds.includes(mi.id) && mi.is_available
    );
    
    const foundIds = foundItems.map(mi => mi.id);
    const missingIds = requestedIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      // Get names of missing items if possible
      const missingItemsInfo = allMenuItems
        .filter(mi => missingIds.includes(mi.id))
        .map(mi => ({ id: mi.id, name: mi.name, is_available: mi.is_available }));
      
      const availableItems = allMenuItems
        .filter(mi => mi.is_available)
        .map(mi => ({ id: mi.id, name: mi.name }));
      
      return res.status(400).json({ 
        message: 'Some menu items are not available',
        details: {
          missing_ids: missingIds,
          missing_items: missingItemsInfo,
          available_items: availableItems,
          suggestion: 'Use one of the available item IDs shown above'
        }
      });
    }
    // Create a map for quick lookup
    const menuItemMap = {};
    foundItems.forEach(mi => {
      menuItemMap[mi.id] = mi;
    });

    // Calculate total and prepare order items
    let total = 0;
    const orderItemsData = items.map(item => {
      const menuItem = menuItemMap[item.menuitem_id];
      
      // Convert Decimal to number properly
      const unitPrice = parseFloat(menuItem.price.toString());
      const quantity = parseInt(item.quantity);
      const itemTotal = unitPrice * quantity;
      
      total += itemTotal;
      
      return {
        menuitem_id: item.menuitem_id,
        quantity: quantity,
        unit_price: unitPrice,
      };
    });

    // Create the order
    const order = await prisma.order.create({
      data: {
        user_id: userId,
        total_price: total,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: { 
        orderItems: { 
          include: { 
            menuItem: true 
          } 
        } 
      },
    });

    return res.status(201).json(order);
    
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ 
      message: 'Failed to create order', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
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
