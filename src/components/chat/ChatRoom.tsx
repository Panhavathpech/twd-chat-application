"use client";

import {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { uploadChatImage } from "@/lib/uploads";
import type {
  ChatRecord,
  ImageAttachment,
  MessageRecord,
  NewMessagePayload,
} from "@/types/chat";
import type { MockUser } from "@/lib/mock-users";

type ChatRoomProps = {
  chat: ChatRecord | null;
  messages: MessageRecord[];
  isLoading: boolean;
  error?: string;
  onSendMessage: (payload: NewMessagePayload) => Promise<void>;
  currentUser: MockUser;
};

const QUICK_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥳",
  "🤔",
  "😭",
  "👍",
  "👀",
  "🔥",
  "❤️",
] as const;

const EmptyState = () => (
  <div className="m-auto flex max-w-md flex-col items-center text-center text-slate-400">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl">
      💬
    </div>
    <p className="text-lg font-semibold text-white">
      Pick or create a chat to get started
    </p>
    <p className="mt-2 text-sm text-slate-400">
      Messages appear instantly across tabs thanks to InstantDB subscriptions.
    </p>
  </div>
);

const ChatHeader = ({ chat }: { chat: ChatRecord }) => {
  const participantList =
    chat.participants?.length && chat.participants.length > 0
      ? chat.participants.join(", ")
      : "No participants yet";

  return (
    <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/5 pb-4 flex-shrink-0">
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
          Chat Room
        </p>
        <h2 className="text-2xl font-semibold text-white">
          {chat.name ?? "Untitled chat"}
        </h2>
        <p className="text-sm text-slate-400">{participantList}</p>
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Real-time • Auto-synced
      </div>
    </header>
  );
};

const MessageFeed = ({
  messages,
  currentUserId,
}: {
  messages: MessageRecord[];
  currentUserId: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<ImageAttachment | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !stickToBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, stickToBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setStickToBottom(distanceFromBottom < 32);
    };
    handleScroll();
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!previewAttachment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewAttachment(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewAttachment]);

  const closePreview = () => setPreviewAttachment(null);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col space-y-3 overflow-y-auto pr-2 text-sm"
    >
      {messages.map((message) => {
        const mine = message.senderId === currentUserId;
        const attachments = message.attachments ?? [];
        const hasAttachments = attachments.length > 0;
        const attachmentGridCols =
          hasAttachments && attachments.length > 1 ? "sm:grid-cols-2" : "";

        return (
          <div
            key={message.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl ${
                mine ? "bg-white text-slate-900" : "bg-white/10 text-white"
              } ${hasAttachments ? "overflow-hidden p-0" : "px-4 py-2"} w-full sm:max-w-[520px] max-w-[90%]`}
            >
              <div
                className={`space-y-1 ${
                  hasAttachments ? "px-4 pt-3" : ""
                }`.trim()}
              >
                <p
                  className={`text-xs font-semibold ${
                    mine ? "text-slate-600" : "text-white/70"
                  }`}
                >
                  {message.senderName ?? "Unknown user"}
                </p>
                {message.content && (
                  <p
                    className={`text-sm ${
                      mine ? "text-slate-900" : "text-white/90"
                    }`}
                  >
                    {message.content}
                  </p>
                )}
              </div>
              {hasAttachments && (
                <div
                  className={`${
                    message.content ? "mt-2" : ""
                  } grid grid-cols-1 gap-2 ${attachmentGridCols}`.trim()}
                >
                  {attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() => setPreviewAttachment(attachment)}
                      className="block w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      aria-label="View image in fullscreen"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.name ?? "Chat image"}
                        width={attachment.width ?? 800}
                        height={attachment.height ?? 600}
                        className="w-full max-h-[360px] object-cover"
                        sizes="(min-width: 768px) 50vw, 90vw"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
              {message.createdAt && (
                <p
                  className={`${hasAttachments ? "px-4 pb-3 pt-2" : "mt-1"} text-[10px] ${
                    mine ? "text-slate-600" : "text-slate-300"
                  }`.trim()}
                >
                  {new Intl.DateTimeFormat("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(message.createdAt))}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
        >
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-white"
              aria-label="Close image preview"
            >
              Close
            </button>
            <div className="rounded-3xl bg-slate-950/70 p-6">
              <Image
                src={previewAttachment.url}
                alt={previewAttachment.name ?? "Chat image preview"}
                width={previewAttachment.width ?? 1600}
                height={previewAttachment.height ?? 1200}
                className="h-auto max-h-[70vh] w-full object-contain"
                sizes="100vw"
                priority
                unoptimized
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
                <p>{previewAttachment.name ?? "Image attachment"}</p>
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-white"
                >
                  Open original ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageComposer = ({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (payload: NewMessagePayload) => Promise<void>;
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = value.trim().length > 0 || attachments.length > 0;

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!hasContent) {
      setError("Add text or an image before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend({
        text: trimmed || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setValue("");
      setAttachments([]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setValue((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    setError(null);
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }
    const file = event.target.files[0];
    event.target.value = "";
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadChatImage(file);
      setAttachments((prev) => [...prev, uploaded]);
      setError(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
    setError(null);
  };

  return (
    <div className="flex-shrink-0 space-y-2 rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/0 px-3 py-1 text-sm text-white transition hover:border-white/30 hover:bg-white/10"
            disabled={disabled || sending}
          >
            😊 Emoji
          </button>
          <button
            type="button"
            onClick={handleAddImage}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/0 px-3 py-1 text-sm text-white transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
            disabled={disabled || sending || uploading}
          >
            📎 {uploading ? "Uploading…" : "Image"}
          </button>
        </div>
        <p>Cmd/Ctrl + Enter to send</p>
      </div>
      {showEmojiPicker && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectEmoji(emoji)}
              className="text-xl transition hover:scale-110"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/20"
            >
              <Image
                src={attachment.url}
                alt={attachment.name ?? "Selected image"}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
              <button
                type="button"
                onClick={() => handleRemoveAttachment(attachment.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-xs text-white"
                aria-label="Remove attachment"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        rows={3}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) {
            setError(null);
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        placeholder={
          disabled ? "Select a chat to start typing…" : "Shift + Enter for newline, Cmd/Ctrl + Enter to send"
        }
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/0 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <p className="text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end text-xs text-slate-400">
        <button
          type="button"
          disabled={disabled || sending || uploading}
          onClick={() => void handleSend()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/60"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
};

const ChatRoom = ({
  chat,
  messages,
  isLoading,
  error,
  onSendMessage,
  currentUser,
}: ChatRoomProps) => {
  const safeMessages = useMemo(
    () => messages.filter((message) => !!message.id),
    [messages],
  );

  if (!chat) {
    return (
      <section className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">
        <EmptyState />
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-l-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black px-8 py-6">
      <ChatHeader chat={chat} />
      <div className="mt-6 flex flex-1 min-h-0 flex-col gap-4">
        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl bg-black/20 p-4">
          {error && (
            <p className="mb-2 rounded-2xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 w-full animate-pulse rounded-2xl bg-white/5"
                />
              ))}
            </div>
          ) : (
            <MessageFeed
              messages={safeMessages}
              currentUserId={currentUser.id}
            />
          )}
        </div>
        <MessageComposer
          disabled={isLoading}
          onSend={onSendMessage}
        />
      </div>
    </section>
  );
};

export default ChatRoom;


