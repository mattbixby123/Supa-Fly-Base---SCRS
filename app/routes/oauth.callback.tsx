import { useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useSearchParams } from "@remix-run/react";
import { parseFormAny } from "react-zorm";
import { z } from "zod";
import bcrypt from "bcrypt"; // Import bcrypt for password hashing

import { supabaseClient } from "~/integrations/supabase";
import {
	refreshAccessToken,
	commitAuthSession,
	getAuthSession,
} from "~/modules/auth";
import { tryCreateUser, getUserByEmail } from "~/modules/user";
import { assertIsPost, safeRedirect } from "~/utils";

// imagine a user go back after OAuth login success or type this URL
// we don't want him to fall in a black hole 👽
export async function loader({ request }: LoaderFunctionArgs) {
	const authSession = await getAuthSession(request);

	if (authSession) return redirect("/userProfile");

	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	assertIsPost(request);

	const formData = await request.formData();
	const result = await z
		.object({
			refreshToken: z.string(),
			redirectTo: z.string().optional(),
			password: z.string().min(8),
		})
		.safeParseAsync(parseFormAny(formData));

	if (!result.success) {
		return json(
			{
				message: "invalid-request",
			},
			{ status: 400 },
		);
	}

	const { redirectTo, refreshToken, password } = result.data;
	const safeRedirectTo = safeRedirect(redirectTo, "/userProfile");

	// We should not trust what is sent from the client
	const authSession = await refreshAccessToken(refreshToken);

	if (!authSession) {
		return json(
			{
				message: "invalid-refresh-token",
			},
			{ status: 401 },
		);
	}

	// User already has an account, skip creation part and just commit session
	if (await getUserByEmail(authSession.email)) {
		return redirect(safeRedirectTo, {
			headers: {
				"Set-Cookie": await commitAuthSession(request, {
					authSession,
				}),
			},
		});
	}

	// First-time sign-in, let's create a brand-new User row in the database
	const hashedPassword = await bcrypt.hash(password, 10);
	const user = await tryCreateUser({
		email: authSession.email,
		userId: authSession.userId,
		password: hashedPassword, // Ensure this is securely handled
	});

	if (!user) {
		return json(
			{
				message: "create-user-error",
			},
			{ status: 500 },
		);
	}

	return redirect(safeRedirectTo, {
		headers: {
			"Set-Cookie": await commitAuthSession(request, {
				authSession,
			}),
		},
	});
}

export default function LoginCallback() {
	const error = useActionData<typeof action>();
	const fetcher = useFetcher();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirectTo") ?? "/userProfile";

	useEffect(() => {
		const {
			data: { subscription },
		} = supabaseClient.auth.onAuthStateChange((event, supabaseSession) => {
			if (event === "SIGNED_IN") {
				const refreshToken = supabaseSession?.refresh_token;

				if (!refreshToken) return;

				const formData = new FormData();
				formData.append("refreshToken", refreshToken);
				formData.append("redirectTo", redirectTo);

				fetcher.submit(formData, { method: "post" });
			}
		});

		return () => {
			// Prevent memory leak. Listener stays alive 👨‍🎤
			subscription.unsubscribe();
		};
	}, [fetcher, redirectTo]);

	return error ? <div>{error.message}</div> : null;
}
