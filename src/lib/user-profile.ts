const ACCENT_CLASSES = [
  "from-rose-500 to-pink-500",
  "from-sky-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-indigo-500 to-blue-500",
  "from-lime-500 to-emerald-500",
  "from-slate-500 to-slate-700",
] as const;

export const slugifyUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

export const defaultDisplayName = (email: string) => {
  const local = email?.split("@")[0]?.trim() ?? "";
  if (!local) return "New User";
  return local
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");
};

export const defaultUsername = (email: string) => {
  const local = email?.split("@")[0]?.trim() ?? "";
  const normalized = slugifyUsername(local || "user");
  return normalized || "user";
};

export const formatHandle = (username: string) =>
  username.startsWith("@") ? username : `@${username}`;

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const pickAccentFromSeed = (seed: string) => {
  if (!seed) {
    return ACCENT_CLASSES[ACCENT_CLASSES.length - 1];
  }
  const numeric = hashSeed(seed);
  const index = numeric % ACCENT_CLASSES.length;
  return ACCENT_CLASSES[index];
};

