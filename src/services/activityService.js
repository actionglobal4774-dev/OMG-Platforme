const ACTIVITY_KEY = "omg_module_activity";

function readAllActivities() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getModuleActivities(moduleId) {
  const all = readAllActivities();
  return all[moduleId] || [];
}

export function saveModuleActivity(moduleId, activity) {
  const all = readAllActivities();
  const nextActivity = {
    id: activity.id || `ACT-${Date.now()}`,
    status: activity.status || "prepared",
    createdAt: activity.createdAt || new Date().toISOString(),
    ...activity
  };
  const moduleActivities = [nextActivity, ...(all[moduleId] || [])].slice(0, 50);
  const next = {
    ...all,
    [moduleId]: moduleActivities
  };
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {
    const compactNext = {
      ...all,
      [moduleId]: moduleActivities.slice(0, 10)
    };
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(compactNext));
    } catch {
      // L'historique local ne doit jamais bloquer une action utilisateur.
    }
  }
  return nextActivity;
}
