import { useMemo, useState, type ReactNode } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { RootContent, PhrasingContent, Definition } from 'mdast';
import { parseMarkdown, markdownTarget } from './model';
import { usePreferences } from '@/preferences/context';

function Picture({ url, alt }: { url: string; alt: string }) {
  const { colors, t } = usePreferences(); const [failed, setFailed] = useState(false);
  const target = markdownTarget(url, true);
  return <View style={{ gap: 6 }}>{!failed && target && <Image source={{ uri: target.url }} accessibilityLabel={alt || t('Image unavailable')} style={{ width: '100%', height: 220 }} resizeMode="contain" onError={() => setFailed(true)} />}
    <Text selectable style={{ color: colors.muted, fontSize: 16 }}>{alt}{failed || !target ? ` (${t('Image unavailable')})` : ''}</Text></View>;
}
function MarkdownLink({ url, children }: { url: string; children: ReactNode }) {
  const { colors, t } = usePreferences(); const [failed, setFailed] = useState(false); const target = markdownTarget(url);
  async function open() {
    if (!target) return;
    try { if (target.kind === 'internal') router.push(target.url as Href); else await Linking.openURL(target.url); }
    catch { setFailed(true); }
  }
  return <Text accessibilityRole={target ? 'link' : 'text'} onPress={target ? () => void open() : undefined} style={{ color: colors.ink, textDecorationLine: target ? 'underline' : 'none' }}>{children}{failed ? ` (${t('Could not open link.')} ${url})` : !target ? ` (${t('Link unavailable')})` : ''}</Text>;
}
export function Markdown({ children }: { children: string }) {
  const { colors: c, t } = usePreferences();
  const tree = useMemo(() => parseMarkdown(children), [children]);
  const definitions = new Map<string, Definition>();
  for (const node of tree.children) if (node.type === 'definition') definitions.set(node.identifier.toUpperCase(), node);
  function inline(nodes: PhrasingContent[]): ReactNode {
    return nodes.map((node, i) => {
      switch (node.type) {
        case 'text': return node.value;
        case 'break': return '\n';
        case 'html': return null;
        case 'inlineCode': return <Text key={i} style={{ fontFamily: 'monospace', backgroundColor: c.surface }}>{node.value}</Text>;
        case 'strong': return <Text key={i} style={{ fontWeight: '700' }}>{inline(node.children)}</Text>;
        case 'emphasis': return <Text key={i} style={{ fontStyle: 'italic' }}>{inline(node.children)}</Text>;
        case 'delete': return <Text key={i} style={{ textDecorationLine: 'line-through' }}>{inline(node.children)}</Text>;
        case 'link': return <MarkdownLink key={`${i}:${node.url}`} url={node.url}>{inline(node.children)}</MarkdownLink>;
        case 'linkReference': { const def = definitions.get(node.identifier.toUpperCase()); return <MarkdownLink key={`${i}:${def?.url ?? ''}`} url={def?.url ?? ''}>{inline(node.children)}</MarkdownLink>; }
        case 'image': return node.alt ?? '';
        case 'imageReference': return node.alt ?? '';
        default: return null;
      }
    });
  }
  function blocks(nodes: RootContent[], depth = 0): ReactNode {
    return nodes.map((node, i) => {
      const body = { color: c.ink, fontSize: 16, lineHeight: 26 };
      switch (node.type) {
        case 'html': case 'definition': return null;
        case 'heading': return <Text key={i} selectable accessibilityRole="header" style={{ ...body, fontSize: 30 - node.depth * 2, lineHeight: 38 - node.depth, fontWeight: '700' }}>{inline(node.children)}</Text>;
        case 'paragraph': return <View key={i} style={{ gap: 8 }}>{node.children.some(n => n.type !== 'image' && n.type !== 'imageReference') && <Text selectable style={body}>{inline(node.children.filter(n => n.type !== 'image' && n.type !== 'imageReference'))}</Text>}{node.children.flatMap((n, j) => n.type === 'image' ? [<Picture key={`${j}:${n.url}`} url={n.url} alt={n.alt ?? ''} />] : n.type === 'imageReference' ? [<Picture key={`${j}:${definitions.get(n.identifier.toUpperCase())?.url ?? ''}`} url={definitions.get(n.identifier.toUpperCase())?.url ?? ''} alt={n.alt ?? ''} />] : [])}</View>;
        case 'code': return <ScrollView key={i} horizontal accessibilityLabel={node.lang ?? 'Code'} style={{ backgroundColor: c.surface }}><Text selectable style={{ ...body, padding: 12, fontFamily: 'monospace' }}>{node.value}</Text></ScrollView>;
        case 'blockquote': return <View key={i} style={{ borderLeftWidth: 3, borderColor: c.border, paddingLeft: 12, gap: 10 }}>{blocks(node.children, depth + 1)}</View>;
        case 'list': return <View key={i} style={{ gap: 8 }}>{node.children.map((item, j) => <View key={j} style={{ flexDirection: 'row', gap: 8 }}><Text style={body}>{typeof item.checked === 'boolean' ? item.checked ? '☑' : '☐' : node.ordered ? `${(node.start ?? 1) + j}.` : '•'}</Text><View style={{ flex: 1, gap: 8 }}>{blocks(item.children, depth + 1)}</View></View>)}</View>;
        case 'thematicBreak': return <View key={i} style={{ height: 1, backgroundColor: c.border }} />;
        case 'table': return <ScrollView key={i} horizontal accessibilityLabel={t('Markdown table')}><View>{node.children.map((row, r) => <View key={r} style={{ flexDirection: 'row' }}>{row.children.map((cell, col) => <View key={col} style={{ width: 200, padding: 10, borderWidth: 1, borderColor: c.border, backgroundColor: r ? c.canvas : c.surface }}><Text selectable style={{ ...body, fontWeight: r ? '400' : '700', textAlign: node.align?.[col] ?? 'left' }}>{inline(cell.children)}</Text></View>)}</View>)}</View></ScrollView>;
        default: return null;
      }
    });
  }
  return <View style={{ gap: 14 }}>{blocks(tree.children)}</View>;
}
