import { SmartInstallButton } from "./SmartInstallButton";

/**
 * Sidebar footer install button. Delegates to SmartInstallButton, which
 * automatically picks the right install flow per browser and hides when the
 * app is already installed.
 *
 * Note: In Lovable's editor preview the service worker and
 * `beforeinstallprompt` event are intentionally disabled, so the native
 * install prompt only appears on the published domain.
 */
export function InstallAppButton() {
  return <SmartInstallButton variant="compact" className="w-full justify-start" />;
}
