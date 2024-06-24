import type { user } from "~/database";
import { db } from "~/database";
import type { AuthSession } from "~/modules/auth";
import {
	createEmailAuthAccount,
	signInWithEmail,
	deleteAuthAccount,
} from "~/modules/auth";
import bcrypt from "bcrypt";

export async function getUserByEmail(email: user["email"]) {
	return db.user.findUnique({ where: { email: email.toLowerCase() } });
}


async function createUser({
  email,
  userId,
  password,
}: Pick<AuthSession, "userId" | "email"> & { password: string; }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return db.user
    .create({
      data: {
        email,
        id: userId,
        username: "",
        password: hashedPassword,
      },
    })
    .then((user) => user)
    .catch(() => null);
}

export async function tryCreateUser({
	email,
	userId,
	password,
}: Pick<AuthSession, "userId" | "email"> & { password: string; }) {
	const user = await createUser({
		userId,
		email,
		password,
	});

	// user account created and have a session but unable to store in User table
	// we should delete the user account to allow retry create account again
	if (!user) {
		await deleteAuthAccount(userId);
		return null;
	}

	return user;
}

export async function createUserAccount(
	email: string,
	password: string,
): Promise<AuthSession | null> {
	const authAccount = await createEmailAuthAccount(email, password);

	// ok, no user account created
	if (!authAccount) return null;

	const authSession = await signInWithEmail(email, password);

	// user account created but no session 😱
	// we should delete the user account to allow retry create account again
	if (!authSession) {
		await deleteAuthAccount(authAccount.id);
		return null;
	}

	const user = await tryCreateUser({ 
		email, 
		userId: authSession.userId, 
		password 
	});

	if (!user) return null;

	return authSession;
}
