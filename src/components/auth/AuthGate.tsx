"use client";

import { FormEvent, useMemo, useState } from "react";
import LogoWordmark from "@/components/LogoWordmark";
import ChatWorkspace from "@/components/chat/ChatWorkspace";
import { db } from "@/lib/instant";
import {
  defaultDisplayName,
  defaultUsername,
  formatHandle,
  pickAccentFromSeed,
  slugifyUsername,
} from "@/lib/user-profile";
import type { UserProfile } from "@/types/chat";

type MagicAuthStep = "email" | "code";

const AuthGate = () => {
  const auth = db.useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<MagicAuthStep>("email");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const authUserId = auth.user?.id ?? null;
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = db.useQuery(
    authUserId
      ? {
          users: {
            $: {
              where: { id: authUserId },
              limit: 1,
            },
          },
        }
      : null,
  );

  const profile = useMemo(() => {
    const record = profileData?.users?.[0];
    return record ? (record as UserProfile) : null;
  }, [profileData]);

  const resetToEmailStep = () => {
    setStep("email");
    setCode("");
    setStatusMessage(null);
    setAuthError(null);
  };

  const handleRequestCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAuthError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      await db.auth.sendMagicCode({ email: trimmedEmail });
      setEmail(trimmedEmail);
      setStatusMessage("We sent a 6-digit code to your inbox.");
      setStep("code");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to send a code right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    const cleanedCode = code.trim();
    if (cleanedCode.length !== 6) {
      setAuthError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      await db.auth.signInWithMagicCode({
        email,
        code: cleanedCode,
      });
      setStatusMessage(null);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to verify the code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await db.auth.signOut();
    resetToEmailStep();
  };

  if (auth.isLoading || (auth.user && profileLoading)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-slate-400">Loading your workspace…</p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-10 text-white">
        <MagicAuthPanel
          email={email}
          code={code}
          busy={busy}
          step={step}
          onEmailChange={setEmail}
          onCodeChange={setCode}
          onRequestCode={handleRequestCode}
          onVerifyCode={handleVerifyCode}
          statusMessage={statusMessage}
          errorMessage={authError ?? auth.error?.message}
          onBackToEmail={resetToEmailStep}
        />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Something went wrong
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Unable to load your profile
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {profileError.message || "Please try again in a moment."}
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="w-full text-sm text-slate-400 underline-offset-4 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-10 text-white">
        <CompleteProfileForm authEmail={auth.user.email ?? ""} userId={auth.user.id} onSignOut={handleSignOut} />
      </div>
    );
  }

  return (
    <ChatWorkspace currentUser={profile} onSignOut={handleSignOut} />
  );
};

const MagicAuthPanel = ({
  email,
  code,
  busy,
  step,
  onEmailChange,
  onCodeChange,
  onRequestCode,
  onVerifyCode,
  statusMessage,
  errorMessage,
  onBackToEmail,
}: {
  email: string;
  code: string;
  busy: boolean;
  step: MagicAuthStep;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onRequestCode: () => Promise<void>;
  onVerifyCode: () => Promise<void>;
  statusMessage: string | null;
  errorMessage?: string | null;
  onBackToEmail: () => void;
}) => {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "email") {
      await onRequestCode();
    } else {
      await onVerifyCode();
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <LogoWordmark className="max-h-10" priority />
      <h1 className="mt-2 text-2xl font-semibold text-white">
        {step === "email" ? "Sign in to continue" : "Check your inbox"}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Use your email to receive a 6-digit code. No password required.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {step === "email" ? (
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-slate-500 focus:border-white/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                We emailed a code to <span className="font-semibold text-white">{email}</span>
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-slate-300 underline-offset-4 hover:text-white"
                onClick={onBackToEmail}
              >
                Use another email
              </button>
            </div>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-300">6-digit code</span>
              <input
                value={code}
                onChange={(event) =>
                  onCodeChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-white/50 focus:outline-none"
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>
          </>
        )}
        {statusMessage && (
          <p className="text-sm text-emerald-300" role="status">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="text-sm text-rose-300" role="alert">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy
            ? "Please wait…"
            : step === "email"
              ? "Send magic code"
              : "Verify code"}
        </button>
      </form>
    </div>
  );
};

const CompleteProfileForm = ({
  authEmail,
  userId,
  onSignOut,
}: {
  authEmail: string;
  userId: string;
  onSignOut: () => Promise<void>;
}) => {
  const [displayName, setDisplayName] = useState(defaultDisplayName(authEmail));
  const [username, setUsername] = useState(defaultUsername(authEmail));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = displayName.trim();
    const slug = slugifyUsername(username);
    if (!trimmedName) {
      setError("Tell us your name so others recognize you.");
      return;
    }
    if (!slug) {
      setError("Pick a username with at least one letter or number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data } = await db.queryOnce({
        users: {
          $: {
            where: { username: slug },
            limit: 1,
          },
        },
      });
      const existingUsers = (data?.users ?? []) as UserProfile[];
      if (existingUsers.length > 0) {
        setError("That username is taken. Try another.");
        setBusy(false);
        return;
      }
      const timestamp = Date.now();
      await db.transact([
        db.tx.users[userId].update({
          id: userId,
          email: authEmail,
          displayName: trimmedName,
          username: slug,
          handle: formatHandle(slug),
          accent: pickAccentFromSeed(authEmail || userId),
          createdAt: timestamp,
        }),
      ]);
    } catch (profileError) {
      setError(
        profileError instanceof Error
          ? profileError.message
          : "Unable to save your profile.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-white backdrop-blur-xl">
      <LogoWordmark className="max-h-10" />
      <p className="mt-2 text-sm uppercase tracking-[0.3em] text-slate-400">
        Welcome
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Create your profile</h1>
      <p className="mt-1 text-sm text-slate-400">
        Choose how other people will see you in chats.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-slate-500 focus:border-white/50 focus:outline-none"
            placeholder="Jane Doe"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Username</span>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="text-slate-500">@</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="jane"
            />
          </div>
          <p className="text-xs text-slate-500">
            Lowercase letters, numbers, or dashes only.
          </p>
        </label>
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={() => {
            void onSignOut();
          }}
          className="w-full text-sm text-slate-400 underline-offset-4 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
};

export default AuthGate;

