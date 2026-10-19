import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoredFirebaseUser, loginFirebaseUser, logoutFirebaseUser, registerFirebaseUser } from "../services/firebaseClient";
import { listCloudCollection, upsertCloudItem } from "../services/cloudCollectionService";

const AuthContext = createContext();
const PERSISTED_MODULE_IDS = ["payflow", "mailport", "store", "property", "restaurant", "school", "city", "health", "travel", "university", "tax", "administration"];

function cloudSafeProfile(profile) {
  const { password, modulePassword, pin, ...safeProfile } = profile || {};
  return safeProfile;
}

function readProfiles() {
  try {
    return JSON.parse(localStorage.getItem("omg_module_profiles") || "{}");
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredFirebaseUser);
  const [moduleProfiles, setModuleProfiles] = useState(readProfiles);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all(PERSISTED_MODULE_IDS.map(async (moduleId) => {
      try {
        const rows = await listCloudCollection(moduleId, "profiles");
        return [moduleId, rows.find((item) => item.id === "current") || null];
      } catch {
        return [moduleId, null];
      }
    })).then((entries) => {
      if (!active) return;
      const cloudProfiles = Object.fromEntries(entries.filter(([, profile]) => profile));
      if (!Object.keys(cloudProfiles).length) return;
      setModuleProfiles((current) => {
        const merged = { ...current, ...cloudProfiles };
        localStorage.setItem("omg_module_profiles", JSON.stringify(merged));
        return merged;
      });
    });
    return () => { active = false; };
  }, [user]);

  const login = async ({ email, password }) => {
    const session = await loginFirebaseUser({ email, password });
    const nextUser = { uid: session.localId, email: session.email, displayName: session.displayName, mode: "firebase" };
    setModuleProfiles({});
    localStorage.removeItem("omg_module_profiles");
    setUser(nextUser);
    return nextUser;
  };

  const register = async ({ email, password, displayName }) => {
    const session = await registerFirebaseUser({ email, password, displayName });
    const nextUser = { uid: session.localId, email: session.email, displayName, mode: "firebase" };
    setModuleProfiles({});
    localStorage.removeItem("omg_module_profiles");
    setUser(nextUser);
    return nextUser;
  };

  const saveModuleProfile = (moduleId, profile) => {
    const next = {
      ...moduleProfiles,
      [moduleId]: {
        ...(moduleProfiles[moduleId] || {}),
        ...profile,
        updatedAt: new Date().toISOString()
      }
    };
    setModuleProfiles(next);
    localStorage.setItem("omg_module_profiles", JSON.stringify(next));
    void upsertCloudItem(moduleId, "profiles", { id: "current", ...cloudSafeProfile(next[moduleId]) }).catch(() => null);
  };

  const getModuleProfile = (moduleId) => moduleProfiles[moduleId] || null;
  const hasModuleProfile = (moduleId) => Boolean(moduleProfiles[moduleId]);
  const logout = () => {
    logoutFirebaseUser();
    setModuleProfiles({});
    localStorage.removeItem("omg_module_profiles");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading: false,
      moduleProfiles,
      login,
      register,
      saveModuleProfile,
      getModuleProfile,
      hasModuleProfile,
      logout
    }),
    [user, moduleProfiles]
  );

  return (
    <AuthContext.Provider value={value}>
      <React.Fragment key={user?.uid || "anonymous"}>{children}</React.Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
