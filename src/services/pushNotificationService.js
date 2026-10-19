import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken } from "./backendService";
import { addNotification } from "./notificationService";

let initialized = false;
let listenerHandles = [];

function normalizeNotification(notification) {
  const data = notification?.data || {};
  return {
    id: notification?.id || `push-${Date.now()}`,
    category: data.category || "account",
    title: notification?.title || "OMG Platforme",
    message: notification?.body || "",
    link: data.link || (data.moduleId ? `/${data.moduleId}` : "/notifications")
  };
}

export async function initializePushNotifications() {
  if (initialized || !Capacitor.isNativePlatform()) {
    return { supported: Capacitor.isNativePlatform(), initialized };
  }

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    return { supported: true, initialized: false, reason: "permission-denied" };
  }

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: "omg_general",
      name: "OMG Platforme",
      description: "Notifications importantes de OMG Platforme",
      importance: 5,
      visibility: 1,
      vibration: true
    });
  }

  listenerHandles = await Promise.all([
    PushNotifications.addListener("registration", async ({ value }) => {
      try {
        await registerPushToken(value, Capacitor.getPlatform());
      } catch (error) {
        console.warn("Le jeton Firebase n'a pas pu etre enregistre.", error?.code || error?.message);
      }
    }),
    PushNotifications.addListener("registrationError", (error) => {
      console.warn("Firebase Notifications n'a pas pu demarrer.", error?.error || error?.message);
    }),
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      addNotification(normalizeNotification(notification));
    }),
    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const item = normalizeNotification(notification);
      addNotification(item);
      if (item.link?.startsWith("/")) window.location.hash = `#${item.link}`;
    })
  ]);

  await PushNotifications.register();
  initialized = true;
  return { supported: true, initialized: true };
}

export async function removePushNotificationListeners() {
  await Promise.all(listenerHandles.map((handle) => handle.remove()));
  listenerHandles = [];
  initialized = false;
}
