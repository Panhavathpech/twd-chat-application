"use client";

import { useMemo, useState } from "react";
import ChatSidebar, {
  type CreateChatRequest,
} from "@/components/chat/ChatSidebar";
import ChatRoom from "@/components/chat/ChatRoom";
import { useLocalUser } from "@/hooks/useLocalUser";
import { db, generateInstantId } from "@/lib/instant";
import type {
  ChatRecord,
  MessageRecord,
  NewMessagePayload,
} from "@/types/chat";

const ChatWorkspace = () => {
  const { user, setUserId } = useLocalUser();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const {
    data: chatsData,
    isLoading: chatsLoading,
    error: chatsError,
  } = db.useQuery({
    chats: {
      $: {},
    },
  });

  const chats = useMemo(
    () =>
      ([...(chatsData?.chats ?? [])] as ChatRecord[]).sort(
        (a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0),
      ),
    [chatsData],
  );

  const resolvedChatId = useMemo(() => {
    if (
      selectedChatId &&
      chats.some((chat) => chat.id === selectedChatId)
    ) {
      return selectedChatId;
    }
    return chats[0]?.id ?? null;
  }, [selectedChatId, chats]);

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = db.useQuery(
    resolvedChatId
      ? {
          messages: {
            $: {
              where: { chatId: resolvedChatId },
            },
          },
        }
      : null,
  );

  const messages = useMemo(
    () =>
      ([...(messagesData?.messages ?? [])] as MessageRecord[]).sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      ),
    [messagesData],
  );

  const activeChat =
    chats.find((chat) => chat.id === resolvedChatId) ?? null;

  const handleCreateChat = async (payload: CreateChatRequest) => {
    const chatId = generateInstantId();
    const timestamp = Date.now();
    const txs = [
      db.tx.chats[chatId].update({
        id: chatId,
        name: payload.name,
        participants: payload.participantIds,
        createdAt: timestamp,
        lastMessageAt: timestamp,
      }),
    ];

    if (payload.initialMessage) {
      const messageId = generateInstantId();
      txs.push(
        db.tx.messages[messageId].update({
          id: messageId,
          chatId,
          senderId: user.id,
          senderName: user.name,
          content: payload.initialMessage,
          createdAt: timestamp,
        }),
      );
    }

    await db.transact(txs);
    setSelectedChatId(chatId);
  };

  const handleSendMessage = async ({ text, attachments }: NewMessagePayload) => {
    if (!activeChat) {
      throw new Error("Select a chat before sending messages.");
    }
    const trimmedText = text?.trim();
    if (!trimmedText && !(attachments && attachments.length > 0)) {
      throw new Error("Add text or an image before sending.");
    }
    const messageId = generateInstantId();
    const timestamp = Date.now();
    await db.transact([
      db.tx.messages[messageId].update({
        id: messageId,
        chatId: activeChat.id,
        senderId: user.id,
        senderName: user.name,
        content: trimmedText ?? undefined,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        createdAt: timestamp,
      }),
      db.tx.chats[activeChat.id].update({
        lastMessageAt: timestamp,
      }),
    ]);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-row overflow-hidden bg-slate-950 text-white">
      <div className="flex h-full min-h-0 w-[280px] max-w-full flex-shrink-0 flex-col border-r border-white/5 bg-slate-950/80 backdrop-blur-xl md:w-[320px] lg:w-[360px]">
        <ChatSidebar
          chats={chats}
          loading={chatsLoading}
          error={chatsError?.message}
          selectedChatId={resolvedChatId}
          onSelectChat={setSelectedChatId}
          onCreateChat={handleCreateChat}
          currentUserId={user.id}
          onChangeUser={setUserId}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <ChatRoom
          chat={activeChat}
          messages={messages}
          isLoading={resolvedChatId ? messagesLoading : false}
          error={
            resolvedChatId && messagesError ? messagesError.message : undefined
          }
          onSendMessage={handleSendMessage}
          currentUser={user}
        />
      </div>
    </div>
  );
};

export default ChatWorkspace;


