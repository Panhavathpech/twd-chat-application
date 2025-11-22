"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import LogoWordmark from "@/components/LogoWordmark";
import type { ChatRecord, UserProfile } from "@/types/chat";
import { db } from "@/lib/instant";
import { uploadUserAvatar } from "@/lib/uploads";
import { formatHandle, slugifyUsername } from "@/lib/user-profile";

export type CreateChatRequest = {
  name: string;
  participantIds: string[];
  initialMessage?: string;
};

type ChatSidebarProps = {
  chats: ChatRecord[];
  loading: boolean;
  error?: string;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (payload: CreateChatRequest) => Promise<void>;
  currentUser: UserProfile;
  people: UserProfile[];
  peopleLoading: boolean;
  peopleError?: string;
  onSignOut: () => Promise<void> | void;
};

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    {label}
  </p>
);

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60_000) {
    return "just now";
  }
  if (diff < 86_400_000) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getInitials = (value?: string) =>
  (value || "User")
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const CurrentUserCard = ({
  user,
  onSignOut,
  onEditProfile,
}: {
  user: UserProfile;
  onSignOut: () => Promise<void> | void;
  onEditProfile: () => void;
}) => (
  <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-4">
    <SectionLabel label="Signed in as" />
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onEditProfile}
        className="relative inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        aria-label="Edit profile"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={`${user.displayName} avatar`}
            width={48}
            height={48}
            className="h-full w-full rounded-full object-cover"
            draggable={false}
            unoptimized
          />
        ) : (
          <span
            className={`inline-flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${
              user.accent ?? "from-slate-500 to-slate-700"
            } font-semibold`}
          >
            {getInitials(user.displayName)}
          </span>
        )}
      </button>
      <div className="text-sm">
        <p className="font-medium text-white">{user.displayName}</p>
        <p className="text-xs text-slate-400">
          {user.handle ?? `@${user.username}`}
        </p>
        {user.email && (
          <p className="text-xs text-slate-500">{user.email}</p>
        )}
        <p className="text-[11px] text-slate-500">
          Click your photo to edit profile
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => {
        void onSignOut();
      }}
      className="text-xs font-semibold text-slate-300 underline-offset-4 transition hover:text-white"
    >
      Sign out
    </button>
  </div>
);

const NewChatForm = ({
  currentUser,
  people,
  isLoadingPeople,
  peopleError,
  onCreate,
}: {
  currentUser: UserProfile;
  people: UserProfile[];
  isLoadingPeople: boolean;
  peopleError?: string;
  onCreate: (payload: CreateChatRequest) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([currentUser.id]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedParticipantIds([currentUser.id]);
  }, [currentUser.id]);

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((value) => value !== id);
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name your chat before creating it.");
      return;
    }
    const participants = Array.from(
      new Set([...selectedParticipantIds, currentUser.id]),
    );
    if (participants.length === 0) {
      setError("Select at least one participant.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name: trimmedName,
        participantIds: participants,
        initialMessage: initialMessage.trim() || undefined,
      });
      setName("");
      setInitialMessage("");
      setSelectedParticipantIds([currentUser.id]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create chat now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <SectionLabel label="Start a new chat" />
        {busy && (
          <p className="text-xs text-slate-300" aria-live="polite">
            Creating…
          </p>
        )}
      </div>
      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Chat name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekend plans"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">First message (optional)</span>
          <textarea
            value={initialMessage}
            onChange={(event) => setInitialMessage(event.target.value)}
            rows={2}
            placeholder="Kick off the conversation…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
          />
        </label>
        <div>
          <span className="text-sm text-slate-300">Participants</span>
          <div className="mt-2 space-y-2">
            {isLoadingPeople ? (
              <div className="h-10 w-full animate-pulse rounded-2xl bg-white/10" />
            ) : peopleError ? (
              <p className="text-xs text-rose-300">{peopleError}</p>
            ) : people.length <= 1 ? (
              <p className="text-xs text-slate-400">
                Invite friends so you can start multi-user chats.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {people
                  .filter((person) => person.id !== currentUser.id)
                  .map((person) => {
                    const checked = selectedParticipantIds.includes(person.id);
                    return (
                      <label
                        key={person.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                          checked
                            ? "border-white/60 bg-white/10 text-white"
                            : "border-white/15 text-slate-300 hover:border-white/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(person.id)}
                          className="h-3 w-3 rounded border border-white/40 bg-transparent accent-white"
                        />
                        <span className="text-white">{person.displayName}</span>
                        <span className="text-slate-400">
                          {person.handle ?? `@${person.username}`}
                        </span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/50"
        >
          Create chat
        </button>
      </form>
    </div>
  );
};

const ChatList = ({
  chats,
  loading,
  error,
  selectedChatId,
  onSelect,
}: {
  chats: ChatRecord[];
  loading: boolean;
  error?: string;
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
}) => {
  if (error) {
    return (
      <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
        {error}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-14 w-full animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
        No chats yet. Use the form above to start one!
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {chats.map((chat) => {
        const isActive = chat.id === selectedChatId;
        return (
          <li key={chat.id}>
            <button
              type="button"
              onClick={() => onSelect(chat.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-white/70 bg-white/10"
                  : "border-white/5 hover:border-white/40 hover:bg-white/5"
              }`}
            >
              <p className="flex items-center justify-between text-sm font-semibold text-white">
                <span>{chat.name ?? "Untitled chat"}</span>
                <span className="text-xs font-normal text-slate-400">
                  {formatRelativeTime(chat.lastMessageAt ?? chat.createdAt)}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {(chat.participants ?? []).length} participant
                {(chat.participants ?? []).length === 1 ? "" : "s"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const ProfileSettingsDialog = ({
  user,
  open,
  onClose,
}: {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
}) => {
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName ?? "");
      setUsername(user.username ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
      setError(null);
      setStatus(null);
    }
  }, [open, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = () => {
    if (!busy && !uploading) {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy && !uploading) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, uploading, onClose]);

  if (!mounted || !open) {
    return null;
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError(null);
    setStatus(null);
    try {
      const url = await uploadUserAvatar(file);
      setAvatarUrl(url);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to upload image right now.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = displayName.trim();
    const slug = slugifyUsername(username);
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    if (!slug) {
      setError("Pick a username with at least one letter or number.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      if (slug !== user.username) {
        const { data } = await db.queryOnce({
          users: {
            $: {
              where: { username: slug },
              limit: 1,
            },
          },
        });
        const existingUsers = (data?.users ?? []) as UserProfile[];
        const conflict = existingUsers.some((record) => record.id !== user.id);
        if (conflict) {
          setError("That username is taken. Try another.");
          setBusy(false);
          return;
        }
      }

      await db.transact([
        db.tx.users[user.id].update({
          id: user.id,
          email: user.email,
          displayName: trimmedName,
          username: slug,
          handle: formatHandle(slug),
          accent: user.accent,
          createdAt: user.createdAt ?? Date.now(),
          avatarUrl: avatarUrl || undefined,
        }),
      ]);
      setStatus("Profile updated.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update profile.",
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={dismiss}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/90 p-6 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/60 hover:text-white disabled:opacity-60"
          disabled={busy || uploading}
        >
          Close
        </button>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              Profile
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Edit your information
            </h2>
            <p className="text-sm text-slate-400">
              Update your photo, display name, and username. Email cannot be
              changed.
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Profile picture</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-16 w-16">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile preview"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${
                      user.accent ?? "from-slate-500 to-slate-700"
                    } text-2xl font-semibold`}
                  >
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:border-white/70 disabled:opacity-60"
                  disabled={uploading || busy}
                >
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl("");
                      setStatus(null);
                    }}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-60"
                    disabled={uploading || busy}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">Display name</span>
            <input
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setError(null);
                setStatus(null);
              }}
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
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError(null);
                  setStatus(null);
                }}
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                placeholder="jane"
              />
            </div>
            <p className="text-xs text-slate-500">
              Lowercase letters, numbers, or dashes only.
            </p>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">Email</span>
            <input
              value={user.email ?? "Not provided"}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-white/70"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          {status && (
            <p className="text-sm text-emerald-300" role="status">
              {status}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-60"
              disabled={busy || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || uploading}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

const ChatSidebar = ({
  chats,
  loading,
  error,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  currentUser,
  people,
  peopleLoading,
  peopleError,
  onSignOut,
}: ChatSidebarProps) => {
  const sidebarChats = useMemo(
    () => chats.filter((chat): chat is ChatRecord & { id: string } => !!chat.id),
    [chats],
  );
  const [existingChatsExpanded, setExistingChatsExpanded] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  return (
    <>
      <aside
        className={`flex h-full min-h-0 w-full flex-1 flex-col ${
          existingChatsExpanded ? "gap-0" : "gap-5"
        } bg-slate-950/70 px-4 py-4 backdrop-blur-xl overflow-y-auto overscroll-y-contain md:px-5 md:py-6`}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <LogoWordmark className="h-8" priority />
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            Chats
          </span>
        </div>
        <div
          className={`space-y-5 transition-all duration-300 ${
            existingChatsExpanded
              ? "pointer-events-none max-h-0 overflow-hidden opacity-0"
              : "opacity-100"
          }`}
        >
          <div className="space-y-2">
            <div className="hidden md:block">
              <LogoWordmark className="max-h-12" priority />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white md:text-2xl">
                Talk at twd.
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Experiment with multi-user conversations powered by twd.
              </p>
            </div>
          </div>
          <CurrentUserCard
            user={currentUser}
            onSignOut={onSignOut}
            onEditProfile={() => setProfileDialogOpen(true)}
          />
          <NewChatForm
            currentUser={currentUser}
            people={people}
            isLoadingPeople={peopleLoading}
            peopleError={peopleError}
            onCreate={onCreateChat}
          />
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
            <button
              type="button"
              aria-expanded={existingChatsExpanded}
              onClick={() =>
                setExistingChatsExpanded((previous) => !previous)
              }
              className="flex items-center justify-between rounded-xl px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 transition hover:text-white"
            >
              <span>Existing chats</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                {existingChatsExpanded ? "Collapse" : "Expand"}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3 w-3 transition-transform ${
                    existingChatsExpanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="M6 15l6-6 6 6"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`mt-3 flex-1 overflow-hidden ${
                existingChatsExpanded ? "min-h-0" : ""
              }`}
            >
              <div className="h-full overflow-y-auto pr-2">
                <ChatList
                  chats={sidebarChats}
                  loading={loading}
                  error={error}
                  selectedChatId={selectedChatId}
                  onSelect={onSelectChat}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
      <ProfileSettingsDialog
        user={currentUser}
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />
    </>
  );
};

export default ChatSidebar;


