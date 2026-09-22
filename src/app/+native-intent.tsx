import { nativeContinuation } from '../navigation/continuation';

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  // Cold navigation can precede the private navigator's route information.
  // The root auth gate preserves validated context while restoring the session.
  const destination = initial ? nativeContinuation(path) : null;
  return destination ? `/?returnTo=${encodeURIComponent(destination)}` : path;
}
