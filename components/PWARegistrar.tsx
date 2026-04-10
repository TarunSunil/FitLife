"use client";

import { useEffect } from "react";

export default function PWARegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {
          // Ignore unregister failures in unsupported environments.
        });

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("obsidian-fit-cache"))
                .map((key) => caches.delete(key)),
            ),
          )
          .catch(() => {
            // Ignore cache cleanup failures in unsupported environments.
          });
      }

      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // Ignore registration failures in unsupported environments.
      });
  }, []);

  return null;
}
