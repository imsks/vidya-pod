"use client";

import { useSyncExternalStore } from "react";
import { MAX_LEARNERS_PER_CHECKOUT } from "@/constants/pricing";

export interface CartLearner {
  id: string;
  name: string;
  standard: string;
  image_url: string | null;
}

const STORAGE_KEY = "vidyapod:sponsor-cart";
const EMPTY: CartLearner[] = [];
const listeners = new Set<() => void>();
let cache: CartLearner[] | null = null;

const read = (): CartLearner[] => {
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLearner[];
    } catch {
      cache = [];
    }
  }
  return cache;
};

const write = (items: CartLearner[]) => {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked; the cart then lasts for this page only.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Children the donor picked to sponsor together, kept in localStorage. */
export const useSponsorCart = () => {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = (id: string) => items.some((item) => item.id === id);
  const isFull = items.length >= MAX_LEARNERS_PER_CHECKOUT;

  return {
    items,
    has,
    isFull,
    add: (learner: CartLearner) => {
      if (!has(learner.id) && !isFull) {
        write([...read(), learner]);
      }
    },
    remove: (ids: string[]) => write(read().filter((item) => !ids.includes(item.id))),
  };
};
