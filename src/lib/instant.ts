import { id, init } from "@instantdb/react";

const FALLBACK_APP_ID = "0a9b6280-fe2a-47e2-b9e5-ed454140b9dd";

const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID ?? FALLBACK_APP_ID;

if (!appId) {
  throw new Error(
    "NEXT_PUBLIC_INSTANTDB_APP_ID is not set. Update your .env.local file with your InstantDB Public App ID."
  );
}

export const db = init({
  appId,
});

export const generateInstantId = () => id();


