export function saveState(key: string, state: any) {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (err) {
    console.warn("Could not save state", err);
  }
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return fallback;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.warn("Could not load state", err);
    return fallback;
  }
}
