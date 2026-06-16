export const ADMIN_PANEL_SESSION_KEY = "celestia-admin-panel-unlocked";

export function isAdminPanelUnlocked(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(ADMIN_PANEL_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminPanelUnlocked(): void {
  try {
    window.sessionStorage.setItem(ADMIN_PANEL_SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearAdminPanelUnlocked(): void {
  try {
    window.sessionStorage.removeItem(ADMIN_PANEL_SESSION_KEY);
  } catch {
    // ignore
  }
}
