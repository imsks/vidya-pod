const SHARE_SLUG_BYTES = 12;
const SHARE_SLUG_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const DEFAULT_APP_URL = "http://localhost:3000";

export const SHARE_PATH_PREFIX = "/sponsorship";

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

export const buildSponsorshipShareUrl = (slug: string | null | undefined): string | null => {
  if (!slug || !isValidShareSlug(slug)) {
    return null;
  }

  return `${getAppBaseUrl()}${SHARE_PATH_PREFIX}/${slug}`;
};

export const buildShareMessage = (learnerName?: string | null): string =>
  learnerName
    ? `I just sponsored ${learnerName}'s learning journey with Vidya Pods. Join me in funding a pod!`
    : "I just sponsored a learner with Vidya Pods. Join me in funding a pod!";

export type SocialShareLinks = {
  twitter: string;
  whatsapp: string;
  facebook: string;
  linkedin: string;
};

export const buildSocialShareLinks = (shareUrl: string, message: string): SocialShareLinks => {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedMessage = encodeURIComponent(message);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
};
