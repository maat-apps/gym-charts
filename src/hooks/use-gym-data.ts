import { useSyncExternalStore } from "react";

import type { Exercise } from "../lib/schemas";
import {
  getGymSnapshot,
  getServerGymSnapshot,
  isGymReady,
  isGymReadyOnServer,
  subscribe,
  type GymState,
} from "../lib/storage";

export function useGymData(): GymState {
  return useSyncExternalStore(subscribe, getGymSnapshot, getServerGymSnapshot);
}

/** Whether the stored data has loaded — see storage.ts's isGymReady. */
export function useGymReady(): boolean {
  return useSyncExternalStore(subscribe, isGymReady, isGymReadyOnServer);
}

/** One exercise by id, or `undefined` (not found, or not loaded yet). */
export function useExercise(id: string): Exercise | undefined {
  return useGymData().data?.exercises.find((exercise) => exercise.id === id);
}
