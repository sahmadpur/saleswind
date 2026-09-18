"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { subscribePushAction, testPushAction, unsubscribePushAction } from "@/actions/push-actions";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Per-browser opt-in to Web Push. The service worker lives at /sw.js. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    (supported
      ? navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub): State => (sub ? "on" : Notification.permission === "denied" ? "denied" : "off"))
      : Promise.reject(new Error("unsupported"))
    ).then(setState, () => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const res = await subscribePushAction(JSON.parse(JSON.stringify(sub)));
      if (res.error) { await sub.unsubscribe(); setNote(res.error); return; }
      setState("on");
    } catch {
      setNote("Could not enable notifications in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await unsubscribePushAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const { sent } = await testPushAction();
    setNote(sent ? "Test sent — it should appear in a moment." : "Nothing was sent. Try disabling and enabling again.");
    setBusy(false);
  }

  if (state === "loading") return <p className="text-sm text-ggrey">Checking this browser…</p>;
  if (state === "unsupported")
    return (
      <p className="text-sm text-ggrey">
        This browser doesn&apos;t support push notifications. On iPhone/iPad, add Saleswind to the Home Screen first (Share → Add to Home Screen) and open it from there.
      </p>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gink-2">
        Get a desktop or phone notification when you&apos;re mentioned, assigned, or an opportunity you own changes — even when Saleswind isn&apos;t open.
        This setting is per browser.
      </p>
      {state === "denied" ? (
        <p className="text-sm text-gred">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {state === "on" ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ggreen-50 px-2.5 py-1 text-xs font-medium text-ggreen">
                <Icon name="notifications_active" /> On in this browser
              </span>
              <Button variant="outline" disabled={busy} onClick={test}>Send test</Button>
              <Button variant="ghost" disabled={busy} onClick={disable}>Turn off</Button>
            </>
          ) : (
            <Button disabled={busy} onClick={enable}>
              <Icon name="notifications" />
              Enable notifications
            </Button>
          )}
        </div>
      )}
      {note && <p className="text-sm text-ggrey">{note}</p>}
    </div>
  );
}
