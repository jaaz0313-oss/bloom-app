export const PLANNER_SETTINGS_KEY = "bloom-planner-settings";

export type PlannerSettings = {
  roleLabel: string;
  name: string;
};

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  roleLabel: "Organizadora de bodas",
  name: "María González",
};

export function loadPlannerSettings(): PlannerSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PLANNER_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(PLANNER_SETTINGS_KEY);
    if (!raw) return DEFAULT_PLANNER_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<PlannerSettings>;
    return {
      roleLabel:
        parsed.roleLabel?.trim() || DEFAULT_PLANNER_SETTINGS.roleLabel,
      name: parsed.name?.trim() || DEFAULT_PLANNER_SETTINGS.name,
    };
  } catch {
    return DEFAULT_PLANNER_SETTINGS;
  }
}

export function savePlannerSettings(settings: PlannerSettings): void {
  localStorage.setItem(PLANNER_SETTINGS_KEY, JSON.stringify(settings));
}
