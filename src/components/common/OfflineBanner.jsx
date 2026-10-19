import React, { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-bold text-black">
      Mode hors ligne — les données locales restent disponibles et seront conservées sur cet appareil.
    </div>
  );
}
