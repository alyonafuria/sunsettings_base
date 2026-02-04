"use client";

import { usePrivy } from '@privy-io/react-auth';

export default function PrivyLoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 border-2 border-black bg-secondary-background opacity-50"
      >
        Loading...
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className="flex flex-col gap-2 items-center">
        <div className="text-sm">
          Logged in as {user?.email?.address || user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4)}
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            if (typeof window !== 'undefined') {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('privy:')) {
                  localStorage.removeItem(key);
                }
              });
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('privy:')) {
                  sessionStorage.removeItem(key);
                }
              });
            }
            window.location.reload();
          }}
          className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={login}
      className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90"
    >
      Login with Privy
    </button>
  );
}
