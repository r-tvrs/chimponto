import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** Se o aparelho está com conexão, pelos eventos `online`/`offline` do navegador. */
export function useOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () =>
    onlineManager.isOnline(),
  );
}
