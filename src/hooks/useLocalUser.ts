"use client";

import { useEffect, useState } from "react";
import { MOCK_USERS, type MockUser } from "@/lib/mock-users";

const STORAGE_KEY = "instant-chat-user-id";

const FALLBACK_USER_ID = MOCK_USERS[0].id;

const isValidUserId = (candidate: string | null) =>
  !!candidate && MOCK_USERS.some((user) => user.id === candidate);

const readStoredUserId = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isValidUserId(stored) ? stored : null;
};

export const useLocalUser = () => {
  const [userId, setUserId] = useState<string>(FALLBACK_USER_ID);

  useEffect(() => {
    const stored = readStoredUserId();
    if (!stored) {
      return;
    }
    Promise.resolve().then(() => {
      setUserId(stored);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, userId);
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && typeof event.newValue === "string") {
        if (MOCK_USERS.some((user) => user.id === event.newValue)) {
          setUserId(event.newValue);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const currentUser =
    MOCK_USERS.find((mockUser) => mockUser.id === userId) ?? MOCK_USERS[0];

  return {
    user: currentUser as MockUser,
    setUserId: (nextId: string) => {
      if (MOCK_USERS.some((mockUser) => mockUser.id === nextId)) {
        setUserId(nextId);
      }
    },
  };
};


