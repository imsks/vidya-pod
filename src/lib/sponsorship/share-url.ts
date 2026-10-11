const SHARE_SLUG_BYTES = 12;
const SHARE_SLUG_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const DEFAULT_APP_URL = "http://localhost:3000";

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** Generates a cryptographically random, URL-safe slug for a public sponsorship URL. */
export const generateShareSlug = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(SHARE_SLUG_BYTES)));

export const isValidShareSlug = (slug: string): boolean => SHARE_SLUG_PATTERN.test(slug);

export const getAppBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");

/** Bare domain shown on the shareable card, e.g. "vidyapods.com". */
export const getAppDomain = (): string => getAppBaseUrl().replace(/^https?:\/\//, "");

export const buildSponsorInviteUrl = (): string => `${getAppBaseUrl()}/sponsor`;

export const buildShareMessage = (learnerName?: string | null): string =>
  learnerName
    ? `I'm sponsoring ${learnerName}'s education with Vidya Pods — a teacher, books and supplies so they can stay in tuition. Join me in sponsoring a child's education!`
    : "I'm sponsoring a learner's education with Vidya Pods — a teacher, books and supplies so they can stay in tuition. Join me in sponsoring a child's education!";

/** Caption a sponsor can paste alongside a screenshot of the share card. */
export const buildShareCaption = (learnerName?: string | null): string =>
  `${buildShareMessage(learnerName)} ${buildSponsorInviteUrl()}`;
