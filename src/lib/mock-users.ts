export type MockUser = {
  id: string;
  name: string;
  handle: string;
  accent: string;
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "alice",
    name: "Alice Park",
    handle: "@alice",
    accent: "from-rose-500 to-pink-500",
  },
  {
    id: "bob",
    name: "Bob Lee",
    handle: "@bob",
    accent: "from-sky-500 to-cyan-500",
  },
  {
    id: "charlie",
    name: "Charlie Kim",
    handle: "@charlie",
    accent: "from-amber-500 to-orange-500",
  },
];


