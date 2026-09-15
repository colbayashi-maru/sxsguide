// The player's own data: what they type in once, and what the guide reads.

import { useCallback, useEffect, useState } from 'react';

export interface Profile {
  /** Server identity. Picking a server fills in startDate automatically. */
  serverName: string;
  nexus: number | null;
  serverNumber: number | null;
  /** ISO date the server opened. Editable directly for unlisted servers. */
  startDate: string;

  className: string;
  currentLevel: number | null;
  targetLevel: number | null;
  currentExp: number | null;
  expPerHour: number | null;
  powerRating: number | null;
}

export const EMPTY_PROFILE: Profile = {
  serverName: '',
  nexus: null,
  serverNumber: null,
  startDate: '',
  className: '',
  currentLevel: null,
  targetLevel: null,
  currentExp: null,
  expPerHour: null,
  powerRating: null,
};

const STORAGE_KEY = 'sxsguide.profile.v1';

function read(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    // Merge onto the defaults so a profile saved by an older build still loads.
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    // Private windows and blocked site data both throw here; an unsaved
    // profile is a better outcome than a blank screen.
    return EMPTY_PROFILE;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* Saving is a convenience; the session still works without it. */
    }
  }, [profile]);

  const update = useCallback(<K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  }, []);

  const reset = useCallback(() => setProfile(EMPTY_PROFILE), []);

  return { profile, setProfile, update, reset };
}

/** A profile is usable once we know when the server opened. */
export function hasServer(p: Profile): boolean {
  return Boolean(p.startDate);
}

export function isConfigured(p: Profile): boolean {
  return hasServer(p) || Boolean(p.className);
}
