import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { safeContinuation } from '../navigation/continuation';
export const parseMarkdown = (value: string) => fromMarkdown(value, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
export function markdownTarget(value: string, image = false): { kind: 'internal' | 'external'; url: string } | null {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return null;
  if (!image) { const internal = ['/', '/start', '/guide'].includes(value) ? value : safeContinuation(value); if (internal) return { kind: 'internal', url: internal }; }
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return { kind: 'external', url: url.href };
  } catch { return null; }
}
