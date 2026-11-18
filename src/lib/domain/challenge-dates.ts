export const CHALLENGE_START = "2026-11-17";
export const CHALLENGE_END = "2026-12-21";
export const CHALLENGE_DAYS = 35;

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function challengeDay(date: string): number | null {
  if (date < CHALLENGE_START || date > CHALLENGE_END) return null;
  const start = new Date(`${CHALLENGE_START}T12:00:00`);
  const selected = new Date(`${date}T12:00:00`);
  return Math.floor((selected.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function isChallengeDate(date: string): boolean {
  return date >= CHALLENGE_START && date <= CHALLENGE_END;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
