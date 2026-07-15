import type { RouteState, SharedState } from "@/types/index.js";

class State<T> {
  name;
  private context: {state: T | null};

  /**
   * @param name This is only for logging purposes, and would help in debugging in case the state is accessed before initialization.
   */
  constructor(name: string) {
    this.name = name;
    this.context = { state: null };
  }
  
  getState(): T {
    if (!this.context.state) {
      throw new Error(this.name + " state accessed before initialization!");
    }
  
    return this.context.state;
  }
  
  setState(newState: T) {
    this.context.state = { ...(this.context.state || {}), ...newState };
  }
}

export const appState = new State<SharedState>("App");
export const routeState = new State<RouteState>("Route");