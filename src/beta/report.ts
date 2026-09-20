import { diagnosticSummary } from './diagnostics';

// Recovery receives no storage, authentication or mutation capability.
export function createReport(input: Parameters<typeof diagnosticSummary>[0], actions: { share(text: string): Promise<void>; support(): Promise<void> }) {
  const summary = diagnosticSummary(input);
  let inspected = false;
  return {
    inspect() { inspected = true; return summary; },
    async share() { if (inspected) await actions.share(summary); },
    async support() { await actions.support(); },
  };
}
