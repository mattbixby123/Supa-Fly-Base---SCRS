import type { user, userProfile } from "@prisma/client";
import { db } from "../../database/db.server";

export type UserProfileWithUser = userProfile & {
  user: Pick<user, "id" | "username" | "email">;
};

export async function getUserProfile({
  userId,
}: {
  userId: user["id"];
}): Promise<UserProfileWithUser | null> {
  return db.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

export async function updateUserProfile({
  userId,
  bio,
  avatarUrl,
}: Pick<userProfile, "bio" | "avatarUrl"> & {
  userId: user["id"];
}): Promise<userProfile> {
  return db.userProfile.upsert({
    where: { userId },
    update: {
      bio,
      avatarUrl,
    },
    create: {
      bio,
      avatarUrl,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export async function deleteUserProfile({
  userId,
}: {
  userId: user["id"];
}) {
  return db.userProfile.delete({
    where: { userId },
  });
}

export async function getUserProfiles() {
  return db.userProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: { user: { createdAt: "desc" } },
  });
}