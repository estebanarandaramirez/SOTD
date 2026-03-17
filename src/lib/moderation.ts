const BLOCKED = [
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "fag", "retard",
  "bitch", "asshole", "bastard", "whore", "slut", "cock", "dick", "pussy",
  "piss", "crap", "damn", "ass", "arse", "twat", "wanker", "prick",
  "spic", "kike", "chink", "gook", "wetback", "tranny",
];

const pattern = new RegExp(
  `\\b(${BLOCKED.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

export function containsProfanity(text: string): boolean {
  return pattern.test(text);
}
