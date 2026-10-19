import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { listCloudCollection, upsertCloudItem } from "../../services/cloudCollectionService";
import { getCollectionModule, getPersistedLocalCollections } from "../../services/modulePersistenceRegistry";

const PREFIX = "omg_local_";

function readLocalCollection(name) {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${PREFIX}${name}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function CloudDataBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    const synchronize = async () => {
      for (const collectionName of getPersistedLocalCollections()) {
        if (!active) return;
        const moduleId = getCollectionModule(collectionName);
        const localItems = readLocalCollection(collectionName);
        try {
          const cloudItems = await listCloudCollection(moduleId, collectionName);
          const merged = new Map(cloudItems.map((item) => [item.id, item]));
          localItems.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
          const items = [...merged.values()];
          window.localStorage.setItem(`${PREFIX}${collectionName}`, JSON.stringify(items));
          await Promise.all(localItems.filter((item) => item?.id).map((item) => upsertCloudItem(moduleId, collectionName, item)));
        } catch {
          // Le cache local reste disponible lorsque Firebase est hors ligne ou non configure.
        }
      }
    };

    void synchronize();
    return () => { active = false; };
  }, [user?.uid]);

  return null;
}
