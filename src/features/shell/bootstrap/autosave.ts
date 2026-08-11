import { saveLastProject } from '@/infrastructure/persistence/local-storage';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

export const AUTOSAVE_DEBOUNCE_MS = 800;

export function startAutosave(debounceMs = AUTOSAVE_DEBOUNCE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = useSimulatorStore.subscribe(
    (state) => [state.nodes, state.edges, state.name, state.cloud, state.viewport] as const,
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const state = useSimulatorStore.getState();
        saveLastProject({
          name: state.name,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          settings: {
            cloud: state.cloud,
            tickMs: state.tickMs,
            presentationMode: state.presentationMode,
          },
          createdAt: state.createdAt,
          now: new Date().toISOString(),
        });
      }, debounceMs);
    },
    { equalityFn: shallowArrayEquals },
  );

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

function shallowArrayEquals(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
