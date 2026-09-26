import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { AccountPage, Copy } from '@/components/account-ui';
import { usePreferences } from '@/preferences/context';
import { toolBySlug } from '@/tools/catalog';
import { EtfResearchScreen } from '@/tools/EtfResearchScreen';
import { MarketStateScreen } from '@/tools/MarketStateScreen';
import { FinancialFreedomScreen } from '@/tools/FinancialFreedomScreen';
import { SecFilingsScreen } from '@/tools/SecFilingsScreen';

export default function PublicToolStatus() {
  const { slug, symbol, benchmark, period } = useLocalSearchParams<{ slug?: string; symbol?: string; benchmark?: string; period?: string }>();
  const tool = toolBySlug(slug);
  const { locale } = usePreferences();
  if (!tool) return <Redirect href={'/tools' as Href} />;
  if (tool.slug === 'etf') return <EtfResearchScreen initialSymbol={typeof symbol === 'string' ? symbol : 'SPY'} initialBenchmark={typeof benchmark === 'string' ? benchmark : 'SPY'} initialPeriod={typeof period === 'string' ? period : '3m'} />;
  if (tool.slug === 'market-rotation') return <MarketStateScreen />;
  if (tool.slug === 'financial-freedom') return <FinancialFreedomScreen />;
  if (tool.slug === 'sec-filings') return <SecFilingsScreen />;

  return <AccountPage title={tool.name[locale]}>
    <Copy>{tool.purpose[locale]}</Copy>
    <Copy>Not available in this build.</Copy>
    <Copy>This is a public tool in the source product. Its native calculator or research workflow is still being implemented. No sign-in is needed to view this status; private save actions are not available here.</Copy>
  </AccountPage>;
}
