// prisma/seed.js
import prismaPkg from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

async function main() {
  // create admin user
  const adminPw = await bcrypt.hash('AdminPass123!', 10);
  const userPw = await bcrypt.hash('CustomerPass123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brewhaven.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@brewhaven.com',
      password_hash: adminPw,
      role: 'admin',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@brewhaven.com' },
    update: {},
    create: {
      username: 'customer1',
      email: 'customer@brewhaven.com',
      password_hash: userPw,
      role: 'customer',
    },
  });

  const cat1 = await prisma.category.upsert({
    where: { name: 'Hot Coffee' },
    update: {},
    create: { name: 'Hot Coffee', description: 'Warm handcrafted coffees' },
  });

  const cat2 = await prisma.category.upsert({
    where: { name: 'Pastries' },
    update: {},
    create: { name: 'Pastries', description: 'Fresh baked goods' },
  });

  const espresso = await prisma.menuItem.upsert({
    where: { name: 'Espresso' },
    update: {},
    create: { name: 'Espresso', description: 'Strong coffee', price: 3.5, category_id: cat1.id },
  });

  const croissant = await prisma.menuItem.upsert({
    where: { name: 'Croissant' },
    update: {},
    create: { name: 'Croissant', description: 'Buttery croissant', price: 3.5, category_id: cat2.id },
  });

  // sample order by customer
  const order = await prisma.order.create({
    data: {
      user_id: customer.id,
      total_price: 10.5,
      orderItems: {
        create: [
          { menuitem_id: espresso.id, quantity: 2, unit_price: espresso.price },
          { menuitem_id: croissant.id, quantity: 1, unit_price: croissant.price },
        ],
      },
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
