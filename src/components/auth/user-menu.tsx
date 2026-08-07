"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { GoogleLoginButton } from "./google-login-button";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (loading) {
    return (
      <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
    );
  }

  if (!user) {
    return <GoogleLoginButton variant="default" />;
  }

  const userAvatar = user.user_metadata?.avatar_url;
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userEmail = user.email;

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all"
        id="user-menu-button"
        aria-expanded={isOpen}
      >
        {userAvatar ? (
          <img
            className="w-9 h-9 rounded-full object-cover border-2 border-amber-500 shadow-sm"
            src={userAvatar}
            alt={userName}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-sm shadow-sm border-2 border-amber-500">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden md:block text-sm font-semibold text-gray-800 dark:text-gray-100">
          {userName}
        </span>
        <svg
          className="w-4 h-4 text-gray-500 hidden md:block"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100 dark:divide-gray-700 py-1">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Signed in as
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {userName}
              </p>
              {userEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userEmail}
                </p>
              )}
            </div>

            <div className="py-1">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
