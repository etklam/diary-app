import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { diaryStyles as styles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import { SmallButton } from '@/components/discovery-controls';
import { createReviewState } from '@/diaries/discovery-state';
import { reviewBuckets, type DiaryReadScope } from '@/diaries/access';
import { instantDate } from '@/diaries/dates';

const labels = { overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', unscheduled: 'Unscheduled', completed: 'Completed' };
export default function ReviewScreen() {
  const { diaryScope } = useAuth();
  return diaryScope ? <Review scope={diaryScope} /> : null;
}
function Review({ scope }: { scope: DiaryReadScope }) {
  const { diaryMutation } = useAuth();
  const model = useMemo(() => createReviewState(scope), [scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.load(); return model.cancel; }, [model, diaryMutation]);
  if (!scope.isCurrent()) return null;
  return <SafeAreaView edges={['left', 'right']} style={styles.page}>
    <SectionList contentContainerStyle={styles.content} stickySectionHeadersEnabled={false}
      sections={state.groups ? reviewBuckets.map(bucket => ({ key: bucket, title: labels[bucket], total: state.groups!.counts[bucket], data: state.groups![bucket] })) : []}
      keyExtractor={item => item.id} refreshing={state.phase === 'refresh'} onRefresh={() => void model.refresh()}
      ListHeaderComponent={<View style={{ gap: 10 }}><Text style={styles.heading}>Review</Text>
        <Text style={styles.meta}>Diary reviews · Read only. Groups follow your account timezone. Completed includes the latest 50 reviewed diaries.</Text>
        {state.phase === 'initial' && <ReadLoading label="Loading diary reviews…" />}
        {state.issue && state.failed !== 'more' && <ReadFailure issue={state.issue} retry={() => void model.retry()} />}
      </View>}
      renderSectionHeader={({ section }) => <View style={styles.block}><Text style={styles.title}>{section.title} · {section.total}</Text>
        <Text style={styles.meta}>{section.data.length} loaded of {section.total}{section.total === 0 ? ' · No reviews' : ''}</Text></View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.date}`} style={[styles.card, { marginBottom: 8 }]}
        onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: item.id } })}>
        <Text style={styles.title}>{item.title || 'Untitled diary'}</Text><Text style={styles.meta}>{item.date}</Text>
        <Labels symbols={item.targetType === 'diary' ? item.stockSymbols : []} tags={[]} />
        <Text style={styles.body}>{{ none: 'No review', pending: 'Pending review', reviewed: 'Reviewed' }[item.reviewStatus]}</Text>
        <Text style={styles.meta}>{item.reviewDueAt ? `Due ${instantDate(item.reviewDueAt)}` : 'No due date'}{item.reviewOutcome ? ` · ${item.reviewOutcome}` : ''}</Text>
      </Pressable>}
      ListFooterComponent={<View style={styles.block}>
        {state.issue && state.failed === 'more' ? <ReadFailure issue={state.issue} retry={() => void model.retry()} />
          : state.phase === 'more' ? <ReadLoading label="Loading next review page…" />
          : state.more ? <SmallButton label="Load more reviews" onPress={() => void model.more()} />
          : state.groups ? <Text style={styles.meta}>End of review queue</Text> : null}
      </View>} />
  </SafeAreaView>;
}
