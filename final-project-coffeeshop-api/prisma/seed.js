import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting BrewHaven database seed...");

// Users
  const adminPassword = await bcrypt.hash("AdminPass123!", 10);
  const baristaPassword = await bcrypt.hash("BaristaPass123!", 10);
  const customerPassword = await bcrypt.hash("CustomerPass123!", 10);

  const admin = await prisma.user.create({
    data: {
      username: "adminUser",
      email: "admin@brewhaven.com",
      password_hash: adminPassword,
      role: "admin",
    },
  });

  const barista = await prisma.user.create({
    data: {
      username: "baristaUser",
      email: "barista@brewhaven.com",
      password_hash: baristaPassword,
      role: "barista",
    },
  });

  const customer = await prisma.user.create({
    data: {
      username: "customerUser",
      email: "customer@brewhaven.com",
      password_hash: customerPassword,
      role: "customer",
    },
  });

  console.log("Users created");

// Categories
  const hotCoffee = await prisma.category.create({
    data: {
      name: "Hot Coffee",
      description: "Freshly brewed hot beverages",
    },
  });

  const coldBrew = await prisma.category.create({
    data: {
      name: "Cold Brew",
      description: "Chilled handcrafted drinks",
    },
  });

  const pastries = await prisma.category.create({
    data: {
      name: "Pastries",
      description: "Fresh baked pastries and treats",
    },
  });

  console.log("Categories created");

// Menu Items
  const espresso = await prisma.menuItem.create({
    data: {
      name: "Espresso",
      description: "A strong, concentrated coffee.",
      price: 3.5,
      category_id: hotCoffee.id,
    },
  });

  const cappuccino = await prisma.menuItem.create({
    data: {
      name: "Cappuccino",
      description: "Espresso with steamed milk and foam.",
      price: 4.75,
      category_id: hotCoffee.id,
    },
  });

  const icedVanilla = await prisma.menuItem.create({
    data: {
      name: "Iced Vanilla Latte",
      description: "A chilled espresso drink with vanilla syrup.",
      price: 5.75,
      category_id: coldBrew.id,
    },
  });

  const croissant = await prisma.menuItem.create({
    data: {
      name: "Croissant",
      description: "Flaky, buttery French pastry.",
      price: 3.5,
      category_id: pastries.id,
    },
  });

  console.log("Menu items created");

// Orders
  const order1 = await prisma.order.create({
    data: {
      user_id: customer.id,
      status: "pending",
      total_price: 10.50,
      orderItems: {
        create: [
          {
            menuitem_id: espresso.id,
            quantity: 2,
            unit_price: 3.5,
          },
          {
            menuitem_id: croissant.id,
            quantity: 1,
            unit_price: 3.5,
          },
        ],
      },
    },
  });

  console.log("Sample order created");

  console.log("Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });