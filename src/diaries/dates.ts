// Diary dates are calendar labels, not instants. Never pass them through Date.
export function civilDate(value: string): string { return value; }

export function instantDate(value: string): string {
  return new Date(value).toLocaleString();
}
