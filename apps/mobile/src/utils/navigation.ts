import { Router } from "expo-router";

/**
 * Go back when a route has navigation history; otherwise replace with a safe
 * in-app fallback instead of allowing Android to fall through to app exit.
 */
export function goBackOrReplace(router: Router, fallback: Parameters<Router["replace"]>[0]) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
