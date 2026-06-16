import type { SharedState } from "@/types/index.js";

const context: {state: SharedState | null} = {
  state: null
};

export function setState(newState: SharedState) {
  context.state = { ...(context.state || {}), ...newState };
}

export function getState(): SharedState {
  if (!context.state) {
    throw new Error("State accessed before initialization!");
  }

  return context.state;
}
