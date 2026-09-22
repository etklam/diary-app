import { useInstantDate , usePreferences } from '@/preferences/context';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { useDiaryStyles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import { SmallButton } from '@/components/discovery-controls';
import { createReviewState } from '@/diaries/discovery-state';
import { reviewBuckets, type DiaryReadScope } from '@/diaries/access';


const labels = { overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', unscheduled: 'Unscheduled', completed: 'Completed' };
export default function ReviewScreen() {
  const { diaryScope } = useAuth();
  return diaryScope ? <Review scope={diaryScope} /> : null;
}
function Review({ scope }: { scope: DiaryReadScope }) {
  const instantDate = useInstantDate();
  const { t } = usePreferences();
  const styles = useDiaryStyles();
  const { diaryMutation } = useAuth();
  const model = useMemo(() => createReviewState(scope), [scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.load(); return model.cancel; }, [model, diaryMutation]);
  if (!scope.isCurrent()) return null;
  return <SafeAreaView edges={['left', 'right']} style={styles.page}>
    <SectionList contentContainerStyle={styles.content} stickySectionHeadersEnabled={false}
      sections={state.groups ? reviewBuckets.map(bucket => ({ key: bucket, title: labels[bucket], total: state.groups!.counts[bucket], data: state.groups![bucket] })) : []}
      keyExtractor={item => item.id} refreshing={state.phase === 'refresh'} onRefresh={() => void model.refresh()}
      ListHeaderComponent={<View style={{ gap: 10 }}><Text style={styles.heading}>{t("Review")}</Text>
        <Text style={styles.meta}>{t("Open a diary to write or edit its review. Groups follow your account timezone. Completed includes the latest 50 reviewed diaries.")}</Text>
        {state.phase === 'initial' && <ReadLoading label={t("Loading diary reviews…")} />}
        {state.issue && state.failed !== 'more' && <ReadFailure issue={state.issue} retry={() => void model.retry()} />}
      </View>}
      renderSectionHeader={({ section }) => <View style={styles.block}><Text style={styles.title}>{t(section.title)} · {section.total}</Text>
        <Text style={styles.meta}>{section.data.length} {t("loaded of")}{' '}{section.total}{section.total === 0 ? ` · ${t('No reviews')}` : ''}</Text></View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.date}`} style={[styles.card, { marginBottom: 8 }]}
        onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: item.id } })}>
        <Text style={styles.title}>{item.title || t('Untitled diary')}</Text><Text style={styles.meta}>{item.date}</Text>
        <Labels symbols={item.targetType === 'diary' ? item.stockSymbols : []} tags={[]} />
        <Text style={styles.body}>{t({ none: 'No review', pending: 'Pending review', reviewed: 'Reviewed' }[item.reviewStatus])}</Text>
        <Text style={styles.meta}>{item.reviewDueAt ? `${t('Due')} ${instantDate(item.reviewDueAt)}` : t('No due date')}{item.reviewOutcome ? ` · ${t(item.reviewOutcome)}` : ''}</Text>
      </Pressable>}
      ListFooterComponent={<View style={styles.block}>
        {state.issue && state.failed === 'more' ? <ReadFailure issue={state.issue} retry={() => void model.retry()} />
          : state.phase === 'more' ? <ReadLoading label={t("Loading next review page…")} />
          : state.more ? <SmallButton label={t("Load more reviews")} onPress={() => void model.more()} />
          : state.groups ? <Text style={styles.meta}>{t("End of review queue")}</Text> : null}
      </View>} />
  </SafeAreaView>;
}
