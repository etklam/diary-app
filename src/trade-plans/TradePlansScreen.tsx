import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { planCopy } from './copy';
import { parsePlanFilters } from './model';
import { tradePlanService } from './service';
import { PlanButton, PlanCard, PlanChoice, PlanField, usePlanStyles } from './ui';

type Filters = { symbol: string; status: string; sortBy: string; page: number };
const initial: Filters = { symbol: '', status: '', sortBy: 'updatedAt-desc', page: 1 };
export default function TradePlansScreen() {
  const { api, diaryScope } = useAuth();
  const { locale } = usePreferences(); const c = planCopy(locale); const styles = usePlanStyles();
  const [draft, setDraft] = useState<Filters>(initial); const [filters, setFilters] = useState<Filters>(initial);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<ReturnType<typeof tradePlanService>['list']>> | null>(null);
  const [loading, setLoading] = useState(true); const [failure, setFailure] = useState(false);
  const service = useMemo(() => api && diaryScope ? tradePlanService(api, diaryScope) : null, [api, diaryScope]);
  useFocusEffect(useCallback(() => {
    void refresh;
    let active = true; const controller = new AbortController();
    const parsed = parsePlanFilters(filters);
    if (!service || !parsed.success) { setFailure(true); setLoading(false); return () => { active = false; controller.abort(); }; }
    setLoading(true); setFailure(false);
    void service.list(parsed.data, controller.signal).then(data => { if (active && diaryScope?.isCurrent()) { setResult(data); setLoading(false); } }).catch(() => { if (active && diaryScope?.isCurrent()) { setFailure(true); setLoading(false); } });
    return () => { active = false; controller.abort(); };
  }, [service, diaryScope, filters, refresh]));
  const apply = () => { const next = { ...draft, page: 1 }; if (parsePlanFilters(next).success) setFilters(next); else setFailure(true); };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.heading}>{c.title}</Text><Text style={styles.muted}>{c.hint}</Text>
    <PlanButton label={c.new} onPress={() => router.push('/trade-plans/new')} testID="plan-new" />
    <PlanCard><Text style={styles.section}>{c.filter}</Text>
      <PlanField label={c.search} value={draft.symbol} onChangeText={symbol => setDraft(old => ({ ...old, symbol }))} autoCapitalize="characters" maxLength={32} />
      <Text style={styles.label}>{c.status}</Text><View style={styles.row}>{(['', 'draft', 'active', 'closed', 'cancelled'] as const).map(value => <PlanChoice key={value} label={value ? c[value] : c.all} selected={draft.status === value} onPress={() => setDraft(old => ({ ...old, status: value }))} />)}</View>
      <Text style={styles.label}>{c.sort}</Text><View style={styles.row}>{([['updatedAt-desc', c.updated], ['createdAt-desc', c.created], ['symbol-asc', c.symbols]] as const).map(([value, label]) => <PlanChoice key={value} label={label} selected={draft.sortBy === value} onPress={() => setDraft(old => ({ ...old, sortBy: value }))} />)}</View>
      <PlanButton label={c.filter} onPress={apply} /><PlanButton label={c.clear} secondary onPress={() => { setDraft(initial); setFilters(initial); }} />
    </PlanCard>
    {loading ? <ActivityIndicator accessibilityLabel={c.loading} /> : failure ? <PlanCard><Text accessibilityRole="alert" style={styles.error}>{c.failure}</Text><PlanButton label={c.retry} onPress={() => setRefresh(value => value + 1)} /></PlanCard> : <>
      {result?.data.length ? result.data.map(plan => <PlanCard key={plan.id}>
        <Text style={styles.section}>{plan.symbol}{plan.setupType ? ` · ${plan.setupType}` : ''}</Text><Text style={styles.muted}>{c[plan.status]}</Text>
        {(['entryZoneLow', 'entryZoneHigh', 'stopLoss', 'targetPrice'] as const).map(field => <Text key={field} style={styles.body}>{c[field]}: {plan[field] ?? '—'}</Text>)}
        {plan.diary && <Text style={styles.muted}>{c.diaryId}: {plan.diary.title} · {plan.diary.date}</Text>}
        <PlanButton label={`${c.edit}: ${plan.symbol}`} onPress={() => router.push({ pathname: '/trade-plans/[id]', params: { id: plan.id } })} testID={`plan-${plan.id}`} />
      </PlanCard>) : <Text style={styles.body}>{c.empty}</Text>}
      {result && <View style={styles.row}><PlanButton label={c.previous} secondary disabled={filters.page <= 1} onPress={() => setFilters(old => ({ ...old, page: old.page - 1 }))} />
        <Text style={styles.body}>{c.page} {result.pagination.page} {c.of} {Math.max(1, result.pagination.totalPages)}</Text>
        <PlanButton label={c.next} secondary disabled={filters.page >= result.pagination.totalPages} onPress={() => setFilters(old => ({ ...old, page: old.page + 1 }))} /></View>}
    </>}
  </ScrollView></SafeAreaView>;
}
