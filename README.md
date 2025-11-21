# Instant Chat Sandbox

A real-time chat playground powered by **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **InstantDB**. It ships with a mock user switcher so you can open multiple tabs (or browsers) and watch messages sync instantly without authentication.

## Tech Stack

- Next.js 16 (App Router, React Server Components, Turbopack)
- React 19 + the new `next/font` Geist family
- Tailwind CSS v4 (config-less setup)
- InstantDB React SDK for realtime reads/writes

## Prerequisites

- Node.js >= 20.9 (InstantDB requires modern Node; `nvm install 22 && nvm use 22` works well)
- An InstantDB Public App ID (a demo ID is provided below)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an `.env.local` file and add your InstantDB public app id (use the provided sandbox id to get started quickly):

   ```bash
   NEXT_PUBLIC_INSTANTDB_APP_ID=0a9b6280-fe2a-47e2-b9e5-ed454140b9dd
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) and open a second tab to see realtime syncing between mock users.

## Available Scripts

| Script        | Description                              |
| ------------- | ---------------------------------------- |
| `npm run dev` | Start the Turbopack-powered dev server   |
| `npm run build` | Create an optimized production build |
| `npm run start` | Run the production server locally    |
| `npm run lint` | Lint the project with ESLint          |

## Project Highlights

- **Mock identities**: Switch between “Alice”, “Bob”, and “Charlie” without auth. The selection is persisted in `localStorage`.
- **Chat creation**: Build new rooms, choose participants, and optionally seed the first message.
- **Rich messaging**: Send emojis or upload image attachments directly from the composer. Messages appear instantly thanks to InstantDB subscriptions and the UI auto-scrolls to the latest entry.
- **Modern UI**: Uses Tailwind v4 with a glassmorphism-inspired layout that works across mobile and desktop breakpoints.

## Customisation Ideas

- Replace mock users with InstantDB Auth or your own provider.
- Extend the schema with typing indicators, read receipts, or file attachments.
- Deploy to Vercel once you are happy with the experience (`npm run build && vercel deploy`).

Have fun experimenting! If you need another InstantDB space, head over to [instantdb.com](https://instantdb.com/docs).

