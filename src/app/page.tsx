"use client";

import AuthGate from "@/components/auth/AuthGate";

export default function Home() {
  return (
    <main className="flex h-screen min-h-0 w-full overflow-hidden">
      <AuthGate />
    </main>
  );
}
