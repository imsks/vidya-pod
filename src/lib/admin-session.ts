const ADMIN_SESSION_KEY = "vidya-admin-pin";

type AdminSessionListener = () => void;

const adminSessionListeners = new Set<AdminSessionListener>();

const notifyAdminSessionListeners = (): void => {
  adminSessionListeners.forEach((listener) => listener());
};

export const subscribeAdminSessionPin = (listener: AdminSessionListener): (() => void) => {
  adminSessionListeners.add(listener);
  return () => {
    adminSessionListeners.delete(listener);
  };
};

export const getAdminSessionPin = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
};

export const setAdminSessionPin = (pin: string): void => {
  sessionStorage.setItem(ADMIN_SESSION_KEY, pin);
  notifyAdminSessionListeners();
};

export const clearAdminSessionPin = (): void => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  notifyAdminSessionListeners();
};
