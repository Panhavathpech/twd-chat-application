"use client";

import { FormEvent, useMemo, useState } from "react";
import { MOCK_USERS } from "@/lib/mock-users";
import type { ChatRecord } from "@/types/chat";

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
  currentUserId: string;
  onChangeUser: (userId: string) => void;
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

const UserSelector = ({
  activeUserId,
  onSelect,
}: {
  activeUserId: string;
  onSelect: (userId: string) => void;
}) => {
  return (
    <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
      <SectionLabel label="You are chatting as" />
      <div className="flex flex-wrap gap-2">
        {MOCK_USERS.map((user) => {
          const isActive = user.id === activeUserId;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user.id)}
              className={`flex flex-1 min-w-[110px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? "border-white/60 bg-white/10 text-white"
                  : "border-white/10 bg-white/0 text-slate-300 hover:border-white/30 hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${user.accent} font-semibold text-white`}
              >
                {user.name
                  .split(" ")
                  .map((token) => token[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="text-sm leading-tight">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-slate-400">
                  {user.handle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const NewChatForm = ({
  currentUserId,
  onCreate,
}: {
  currentUserId: string;
  onCreate: (payload: CreateChatRequest) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([currentUserId]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      new Set([...selectedParticipantIds, currentUserId]),
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
      setSelectedParticipantIds([currentUserId]);
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
          <div className="mt-2 flex flex-wrap gap-2">
            {MOCK_USERS.map((user) => {
              const checked = selectedParticipantIds.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                    checked
                      ? "border-white/60 bg-white/10 text-white"
                      : "border-white/15 text-slate-300 hover:border-white/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(user.id)}
                    className="h-3 w-3 rounded border border-white/40 bg-transparent accent-white"
                  />
                  {user.name}
                </label>
              );
            })}
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

const ChatSidebar = ({
  chats,
  loading,
  error,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  currentUserId,
  onChangeUser,
}: ChatSidebarProps) => {
  const sidebarChats = useMemo(
    () => chats.filter((chat): chat is ChatRecord & { id: string } => !!chat.id),
    [chats],
  );
  const [existingChatsExpanded, setExistingChatsExpanded] = useState(false);

  return (
    <aside
      className={`flex h-full min-h-0 w-full flex-1 flex-col ${
        existingChatsExpanded ? "gap-0" : "gap-5"
      } bg-slate-950/70 p-5 backdrop-blur-xl`}
    >
      <div
        className={`space-y-5 transition-all duration-300 ${
          existingChatsExpanded
            ? "pointer-events-none max-h-0 overflow-hidden opacity-0"
            : "opacity-100"
        }`}
      >
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Instant Chat
          </p>
          <h1 className="text-2xl font-semibold text-white">Realtime sandbox</h1>
          <p className="mt-1 text-sm text-slate-400">
            Experiment with multi-user conversations powered by InstantDB.
          </p>
        </div>
        <UserSelector activeUserId={currentUserId} onSelect={onChangeUser} />
        <NewChatForm currentUserId={currentUserId} onCreate={onCreateChat} />
      </div>
      <div className="flex flex-1">
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
  );
};

export default ChatSidebar;


