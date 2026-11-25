/**
 * Web Push client service.
 * Flow: ask permission -> get VAPID public key from API ->
 *       pushManager.subscribe() -> send subscription to backend.
 */
import { notificationApi } from "../api/services";

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** Converts the base64url VAPID key into the Uint8Array the browser needs. */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function getRegistration() {
  return navigator.serviceWorker.ready;
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}

export async function enablePush() {
  if (!isPushSupported()) throw new Error("Push notifications are not supported in this browser");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");

  const { publicKey } = await notificationApi.publicKey();
  const registration = await getRegistration();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // every push must show a visible notification
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  // Save (or re-assign) this browser's subscription to the logged-in user
  await notificationApi.subscribe(subscription.toJSON());
  return subscription;
}

/** Removes the subscription from the server and the browser. */
export async function disablePush() {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  try {
    await notificationApi.unsubscribe(subscription.endpoint);
  } catch {
    // server copy may already be gone - still unsubscribe locally
  }
  await subscription.unsubscribe();
}
