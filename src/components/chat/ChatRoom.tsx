"use client";

import type { JSX } from "react";
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
  UserProfile,
} from "@/types/chat";

type ChatRoomProps = {
  chat: ChatRecord | null;
  messages: MessageRecord[];
  isLoading: boolean;
  error?: string;
  onSendMessage: (payload: NewMessagePayload) => Promise<void>;
  currentUser: UserProfile;
  participantsLookup: Map<string, UserProfile>;
  isDesktopViewport: boolean;
  onBackToList?: () => void;
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

const LINK_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const renderMessageContent = (content: string) => {
  const nodes: JSX.Element[] = [];
  const regex = new RegExp(LINK_REGEX.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(
        <span key={`text-${start}`}>{content.slice(lastIndex, start)}</span>,
      );
    }

    const url = match[0];
    const href = url.startsWith("http") ? url : `https://${url}`;

    nodes.push(
      <a
        key={`link-${start}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="break-all text-sky-300 underline underline-offset-2 hover:text-sky-100"
      >
        {url}
      </a>,
    );

    lastIndex = start + url.length;
  }

  if (lastIndex < content.length) {
    nodes.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return nodes;
};

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

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    aria-label="Back to chats list"
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span>Back</span>
  </button>
);

const ChatHeader = ({
  chat,
  participantsLookup,
  showBackButton,
  onBack,
}: {
  chat: ChatRecord;
  participantsLookup: Map<string, UserProfile>;
  showBackButton: boolean;
  onBack?: () => void;
}) => {
  const participantList =
    chat.participants?.length && chat.participants.length > 0
      ? chat.participants
          .map((participantId) => {
            const profile = participantsLookup.get(participantId);
            if (!profile) {
              return participantId;
            }
            const usernameHandle = profile.username
              ? `@${profile.username}`
              : undefined;
            return (
              profile.handle ?? usernameHandle ?? profile.displayName ?? participantId
            );
          })
          .join(", ")
      : "No participants yet";

  return (
    <header className="flex flex-col gap-3 border-b border-white/5 pb-4 flex-shrink-0 md:flex-row md:items-end md:justify-between">
      <div className="flex w-full items-center gap-3 md:items-end">
        {showBackButton && onBack ? (
          <BackButton onClick={onBack} />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
            Chat Room
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {chat.name ?? "Untitled chat"}
          </h2>
          <p className="text-sm text-slate-400">{participantList}</p>
        </div>
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 md:self-auto self-start">
        Real-time • Auto-synced
      </div>
    </header>
  );
};

const MessageFeed = ({
  messages,
  currentUserId,
  participantsLookup,
  onUserScroll,
}: {
  messages: MessageRecord[];
  currentUserId: string;
  participantsLookup: Map<string, UserProfile>;
  onUserScroll?: (direction: "up" | "bottom") => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<ImageAttachment | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const lastDirection = useRef<"up" | "bottom">("bottom");

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
      const nearBottom = distanceFromBottom < 32;
      setStickToBottom(nearBottom);
      if (!onUserScroll) {
        return;
      }
      if (!nearBottom && lastDirection.current !== "up") {
        lastDirection.current = "up";
        onUserScroll("up");
      } else if (nearBottom && lastDirection.current !== "bottom") {
        lastDirection.current = "bottom";
        onUserScroll("bottom");
      }
    };
    handleScroll();
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [onUserScroll]);

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
      className="flex h-full flex-col space-y-3 overflow-y-auto pr-2 pb-4 text-sm"
    >
      {messages.map((message, index) => {
        const mine = message.senderId === currentUserId;
        const senderProfile = message.senderId
          ? participantsLookup.get(message.senderId)
          : undefined;
        const displaySenderName =
          senderProfile?.displayName ??
          senderProfile?.handle ??
          message.senderName ??
          "Unknown user";
        const nextMessage = messages[index + 1];
        const isLatestFromSender =
          !nextMessage || nextMessage.senderId !== message.senderId;
        const shouldShowAvatar = !mine && isLatestFromSender;
        const avatarUrl = senderProfile?.avatarUrl;
        const avatarFallback =
          displaySenderName.charAt(0)?.toUpperCase() ?? "?";
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
              className={`flex items-end gap-3 ${
                mine ? "flex-row-reverse" : ""
              }`}
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
                    {displaySenderName}
                  </p>
                  {message.content && (
                    <p
                      className={`text-sm ${
                        mine ? "text-slate-900" : "text-white/90"
                      }`}
                    >
                      {renderMessageContent(message.content)}
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
              {shouldShowAvatar && (
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white/80">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={`${displaySenderName} avatar`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      sizes="32px"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {avatarFallback}
                    </span>
                  )}
                </div>
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
  allowCollapse,
  expanded,
  onExpand,
  onCollapse,
}: {
  disabled?: boolean;
  onSend: (payload: NewMessagePayload) => Promise<void>;
  allowCollapse: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
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
      if (allowCollapse) {
        onCollapse();
      }
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

  const showFullUI = !allowCollapse || expanded;

  return (
    <div
      className={`flex-shrink-0 transition-all duration-200 ${
        showFullUI
          ? "space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 md:rounded-3xl"
          : "space-y-2 rounded-none border-none bg-transparent p-0 md:space-y-2"
      }`}
    >
      <div
        className={`flex items-center justify-between text-xs text-slate-400 transition-opacity ${
          showFullUI ? "opacity-100" : "opacity-0 pointer-events-none md:opacity-100"
        }`}
      >
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
      {showEmojiPicker && showFullUI && (
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
      {attachments.length > 0 && showFullUI && (
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
        onFocus={() => {
          if (allowCollapse && !expanded) {
            onExpand();
          }
        }}
        onBlur={() => {
          if (allowCollapse && !hasContent) {
            onCollapse();
          }
        }}
        placeholder={
          disabled ? "Select a chat to start typing…" : "Shift + Enter for newline, Cmd/Ctrl + Enter to send"
        }
        className={`w-full resize-none rounded-2xl border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          showFullUI ? "bg-white/0" : "bg-white/5"
        }`}
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
      <div
        className={`flex items-center justify-end text-xs text-slate-400 transition-opacity ${
          showFullUI ? "opacity-100" : "opacity-0 pointer-events-none md:opacity-100"
        }`}
      >
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
  participantsLookup,
  isDesktopViewport,
  onBackToList,
}: ChatRoomProps) => {
  const safeMessages = useMemo(
    () => messages.filter((message) => !!message.id),
    [messages],
  );
  const showBackButton = !isDesktopViewport && typeof onBackToList === "function";
  const allowCollapse = !isDesktopViewport;
  const [composerExpanded, setComposerExpanded] = useState(!allowCollapse);

  useEffect(() => {
    setComposerExpanded(!allowCollapse);
  }, [allowCollapse, chat?.id]);

  const handleScrollIntent = (direction: "up" | "bottom") => {
    if (!allowCollapse) {
      return;
    }
    if (direction === "up") {
      setComposerExpanded(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col rounded-none bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-4 md:rounded-l-3xl md:px-8 md:py-6">
      {chat ? (
        <>
          <ChatHeader
            chat={chat}
            participantsLookup={participantsLookup}
            showBackButton={showBackButton}
            onBack={onBackToList}
          />
          <div className="mt-4 flex flex-1 min-h-0 flex-col gap-4 md:mt-6">
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-black/20 p-3 md:rounded-3xl md:p-4">
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
                  participantsLookup={participantsLookup}
                  onUserScroll={handleScrollIntent}
                />
              )}
            </div>
            <MessageComposer
              disabled={isLoading}
              onSend={onSendMessage}
              allowCollapse={allowCollapse}
              expanded={composerExpanded}
              onExpand={() => setComposerExpanded(true)}
              onCollapse={() => setComposerExpanded(false)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {showBackButton && onBackToList && (
            <div className="self-start">
              <BackButton onClick={onBackToList} />
            </div>
          )}
          <EmptyState />
        </div>
      )}
    </section>
  );
};

export default ChatRoom;


