import { usePreferences } from '@/preferences/context';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SectionList, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { QuickAction } from '@/navigation/workspace';
import { PrimaryButton } from '@/components/auth-ui';
import { useDiaryStyles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import type { DiaryReadScope } from '@/diaries/access';
import { civilDate } from '@/diaries/dates';
import { createTimelineState } from '@/diaries/state';
import { Filters, QueryField, SmallButton, useControls } from '@/components/discovery-controls';
import type { DiscoveryInput } from '@/diaries/query';
import { groupTimelineEntries } from '@diary/domain';
import type { DiarySummary } from '@diary/contracts/diary-summary';

type DiarySection = { period: string; data: DiarySummary[] };

export default function TimelineScreen({ library = false }: { library?: boolean }) {
  const { diaryScope } = useAuth();
  return diaryScope ? <Timeline key={diaryScope.ownerId} scope={diaryScope} library={library} /> : null;
}

function Timeline({ scope, library }: { scope: DiaryReadScope; library: boolean }) {
  const { t, locale } = usePreferences();
  const styles = useDiaryStyles();
  const controls = useControls();
  const { diaryMutation } = useAuth();
  const observed = useRef(diaryMutation);
  const model = useMemo(() => createTimelineState(scope, { mode: library ? 'library' : 'timeline' }), [scope, library]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [input, setInput] = useState<DiscoveryInput>({});
  const [filters, showFilters] = useState(false);
  const change = (patch: DiscoveryInput, debounce = false) => {
    const next = { ...input, ...patch }; setInput(next); model.setQuery(next, debounce);
  };
  useEffect(() => { void model.load(); return model.cancel; }, [model]);
  useEffect(() => {
    if (observed.current === diaryMutation) return;
    observed.current = diaryMutation;
    void model.refresh();
  }, [diaryMutation, model]);
  if (!scope.isCurrent()) return null;
  const sections: DiarySection[] = library
    ? [{ period: '', data: state.rows }]
    : groupTimelineEntries(state.rows).map(group => ({ period: group.period, data: group.entries }));
  const monthLabel = (period: string) => {
    if (locale === 'en') return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(`${period}-01T00:00:00Z`));
    const [year, month] = period.split('-');
    return `${year}年${Number(month)}月`;
  };
  const hasActiveQuery = Object.entries(input).some(([key, value]) => key !== 'sortBy' && key !== 'limit' && Boolean(value?.trim()));
  return <SafeAreaView edges={['left', 'right']} style={styles.page}>
    <SectionList<DiarySummary, DiarySection>
      testID="timeline-list"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      sections={sections}
      keyExtractor={item => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      refreshing={state.phase === 'refresh'}
      onRefresh={() => void model.refresh()}
      ListHeaderComponent={<View style={{ gap: 12 }}>
        <Text style={styles.heading}>{t(library ? 'Library' : 'Timeline')}</Text>
        <QuickAction testID="timeline-quick" />
        <PrimaryButton label={t('Write complete diary')} onPress={() => router.push('/diaries/editor' as Href)} />
        <View style={controls.wrap}>
          <SmallButton label={t(library ? 'Timeline' : 'Library')} selected={false} onPress={() => router.push(library ? '/timeline' : '/library')} />
          <SmallButton label={t("Calendar")} onPress={() => router.push('/calendar')} />
          <SmallButton label={t("Review")} onPress={() => router.push('/review')} />
        </View>
        <QueryField label={t("Search diaries")} value={input.search} change={search => change({ search }, true)} />
        <View style={controls.wrap}>
          <SmallButton label={t("Clear search")} onPress={() => change({ search: '' })} />
          <SmallButton label={filters ? 'Hide filters' : 'Filters'} onPress={() => showFilters(!filters)} />
          <SmallButton label={t("Reset")} onPress={() => { setInput({}); model.setQuery({}); }} />
        </View>
        {filters && <Filters input={input} change={patch => change(patch)} library={library} />}
        <Text style={styles.meta}>{Object.entries(input).filter(([, value]) => value?.trim()).map(([key, value]) => `${key}: ${value}`).join(' · ') || t('All diaries · Newest first')}</Text>
        {state.invalid && <Text accessibilityRole="alert" style={styles.body}>{t("Check your filters. Use valid YYYY-MM-DD dates; the end must be on or after the start.")}</Text>}
        {state.total !== null && <Text accessibilityLiveRegion="polite" style={styles.meta}>{state.total} {t("results ·")}{' '}{state.rows.length} {t("loaded")}</Text>}
        {state.issue && state.failed !== 'more' && <ReadFailure issue={state.issue} retry={() => void model.retry()} />}
      </View>}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.date}, ${item.title || 'Untitled diary'}`}
        style={styles.card} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: item.id } })}>
        <Text style={styles.meta}>{civilDate(item.date)}</Text>
        <Text style={styles.title}>{item.title || t('Untitled diary')}</Text>
        {!!item.excerpt && <Text numberOfLines={3} style={styles.body}>{item.excerpt}</Text>}
        <Labels symbols={item.stockSymbols} tags={item.tags} />
        {(item.transactionCount > 0 || item.reviewStatus !== 'none') && <Text style={styles.meta}>
          {[item.transactionCount > 0 ? `${item.transactionCount} transactions` : null, item.reviewStatus !== 'none' ? `Review: ${item.reviewStatus}` : null].filter(Boolean).join(' · ')}
        </Text>}
      </Pressable>}
      renderSectionHeader={({ section }) => section.period ? <View style={[styles.block, { paddingHorizontal: 0 }]}>
        <Text accessibilityRole="header" style={styles.title}>{monthLabel(section.period)}</Text>
      </View> : null}
      ListEmptyComponent={state.phase === 'initial' ? <ReadLoading label={t(library ? 'Loading your Library…' : "Loading your Timeline…")} /> : !state.issue && !state.invalid && state.phase === 'idle' ? <View style={styles.block}>
        <Text style={styles.title}>{library && state.total === 0 && !hasActiveQuery ? t('Your diary library is empty.') : t(library ? 'No matching diaries' : 'No diaries in this date range.')}</Text>
        {(hasActiveQuery || library && state.total !== 0) && <Text style={styles.body}>{t("Try clearing your search or filters.")}</Text>}
      </View> : null}
      ListFooterComponent={<View style={styles.block}>
        {library ? state.totalPages !== null && state.totalPages > 0 && <View style={[controls.wrap, { alignItems: 'center' }]}>
          <SmallButton label={t('Previous page')} disabled={state.phase !== 'idle' || state.page <= 1} onPress={() => model.goToPage(state.page - 1)} />
          <Text accessibilityLiveRegion="polite" style={styles.meta}>{t('Page')} {state.page} {t('of')} {state.totalPages}</Text>
          <SmallButton label={t('Next page')} disabled={state.phase !== 'idle' || state.page >= state.totalPages} onPress={() => model.goToPage(state.page + 1)} />
        </View> : state.issue && state.failed === 'more' ? <ReadFailure issue={state.issue} retry={() => void model.retry()} />
          : state.phase === 'more' ? <ReadLoading label={t("Loading more diaries…")} />
          : state.hasMore ? <PrimaryButton label={t("Load more")} disabled={state.phase !== 'idle'} onPress={() => void model.more()} />
          : state.rows.length > 0 ? <Text style={styles.meta}>{t("You’re up to date · End of Timeline")}</Text> : null}
      </View>}
    />
  </SafeAreaView>;
}
