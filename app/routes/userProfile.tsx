import React from 'react';
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";

import { LogoutButton, requireAuthSession } from "../modules/auth";
import { getUserProfile } from "../modules/userProfile/service.server";
import { notFound } from "../utils/http.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { userId } = await requireAuthSession(request);

  const userProfile = await getUserProfile({ userId });

  if (!userProfile) {
    throw notFound(`No user profile found for user with id ${userId}`);
  }

  return json({ userProfile });
}

export default function UserProfilePage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">User Profile</Link>
        </h1>
        <p>{data.userProfile.user.email}</p>
        <LogoutButton />
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <p className="text-gray-700" id="username">{data.userProfile.user.username}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bio">
                Bio
              </label>
              <p className="text-gray-700" id="bio">{data.userProfile.bio || "No bio provided"}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="avatar">
                Avatar
              </label>
              {data.userProfile.avatarUrl ? (
                <img src={data.userProfile.avatarUrl} alt="User Avatar" className="w-32 h-32 rounded-full" />
              ) : (
                <p className="text-gray-700">No avatar uploaded</p>
              )}
            </div>
          </div>
          <Link to="/edit-profile" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Edit Profile
          </Link>
        </div>
      </main>
    </div>
  );
}