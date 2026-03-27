"use client";

import { useEffect } from "react";

export default function PWARegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore registration failures in unsupported environments.
      });
    }
  }, []);

  return null;
}
