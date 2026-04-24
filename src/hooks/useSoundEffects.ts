import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { setSoundEnabled, setSoundVolume } from "@/lib/soundEffects";

/**
 * Centralizes sound preferences from user profile.
 * Call once near the app root (e.g. MainLayout).
 */
export function useSoundEffects() {
  const { data: profile } = useProfile();

  useEffect(() => {
    // Use reminder_sound as the global "UI sounds enabled" toggle
    const enabled = profile?.reminder_sound ?? true;
    setSoundEnabled(enabled);
  }, [profile?.reminder_sound]);

  useEffect(() => {
    // Ambient volume doubles as the general UI sound volume (0-100 → 0-1)
    const vol = profile?.ambient_volume ?? 50;
    setSoundVolume(vol / 100);
  }, [profile?.ambient_volume]);
}
