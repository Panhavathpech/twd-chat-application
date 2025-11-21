export type ChatRecord = {
  id: string;
  name?: string;
  participants?: string[];
  createdAt?: number;
  lastMessageAt?: number;
};

export type ImageAttachment = {
  id: string;
  url: string;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
};

export type MessageRecord = {
  id: string;
  chatId: string;
  senderId?: string;
  senderName?: string;
  content?: string;
  attachments?: ImageAttachment[];
  createdAt?: number;
};

export type NewMessagePayload = {
  text?: string;
  attachments?: ImageAttachment[];
};

export type UserProfile = {
  id: string;
  email?: string;
  displayName: string;
  username: string;
  handle?: string;
  accent?: string;
  avatarUrl?: string;
  createdAt?: number;
};


