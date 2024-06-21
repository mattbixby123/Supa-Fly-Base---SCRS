/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_SERVICE_ROLE, SUPABASE_URL } from "../utils/env";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const prisma = new PrismaClient();

const email = "hello@supabase.com";

const getUserId = async (): Promise<string> => {
  const userList = await supabaseAdmin.auth.admin.listUsers();

  if (userList.error) {
    throw userList.error;
  }

  const existingUserId = userList.data.users.find((user) => user.email === email)?.id;

  if (existingUserId) {
    return existingUserId;
  }

  const newUser = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "supabase",
    email_confirm: true,
  });

  if (newUser.error) {
    throw newUser.error;
  }

  return newUser.data.user.id;
};

async function seed() {
  try {
    const id = await getUserId();

    // Cleanup the existing database
    await prisma.user.delete({ where: { email } }).catch(() => {
      // No worries if it doesn't exist yet
    });

    // Create a new user in Prisma
    const user = await prisma.user.create({
      data: {
        id,
        email,
        username: "supabase_user",
        password: "supabase", // Ensure to use a hashed password in a real application
        profile: {
          create: {
            bio: "This is a bio",
            avatarUrl: "http://example.com/avatar.png",
          },
        },
      },
    });

    // Create brand
    const brand = await prisma.brand.create({
      data: {
        name: "Test Brand",
      },
    });

    // Create product with tags
    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        brandId: brand.id,
        description: "This is a test product.",
        tags: {
          create: [
            { tag: { create: { name: "Hydrating" } } },
            { tag: { create: { name: "Vegan" } } },
          ],
        },
      },
    });

    // Create a review
    const review = await prisma.review.create({
      data: {
        rating: 5,
        comment: "Great product!",
        userId: user.id,
        productId: product.id,
      },
    });

    // Create a like for the review
    await prisma.like.create({
      data: {
        userId: user.id,
        reviewId: review.id,
      },
    });

    // Create a comment for the review
    await prisma.comment.create({
      data: {
        content: "I agree, this product is awesome!",
        userId: user.id,
        reviewId: review.id,
      },
    });

    // Add product to wishlist
    await prisma.wishlist.create({
      data: {
        userId: user.id,
        products: {
          connect: { id: product.id },
        },
      },
    });

    console.log(`Database has been seeded. 🌱\n`);
    console.log(
      `User added to your database 👇 \n🆔: ${user.id}\n📧: ${user.email}\n🔑: supabase`,
    );
  } catch (cause) {
    console.error(cause);
    throw new Error("Seed failed 🥲");
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
