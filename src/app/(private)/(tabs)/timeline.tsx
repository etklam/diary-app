import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { PrimaryButton } from '@/components/auth-ui';
import { diaryStyles as styles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import type { DiaryReadScope } from '@/diaries/access';
import { civilDate } from '@/diaries/dates';
import { createTimelineState } from '@/diaries/state';

export default function TimelineScreen() {
  const { diaryScope } = useAuth();
  return diaryScope ? <Timeline key={diaryScope.ownerId} scope={diaryScope} /> : null;
}

function Timeline({ scope }: { scope: DiaryReadScope }) {
  const { diaryMutation, beginQuick } = useAuth();
  const observed = useRef(diaryMutation);
  const model = useMemo(() => createTimelineState(scope), [scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.load(); return model.cancel; }, [model]);
  useEffect(() => {
    if (observed.current === diaryMutation) return;
    observed.current = diaryMutation;
    void model.refresh();
  }, [diaryMutation, model]);
  if (!scope.isCurrent()) return null;
  return <SafeAreaView edges={['left', 'right']} style={styles.page}>
    <FlatList
      testID="timeline-list"
      data={state.rows}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      refreshing={state.phase === 'refresh'}
      onRefresh={() => void model.refresh()}
      ListHeaderComponent={<View style={{ gap: 12 }}>
        <Text style={styles.heading}>Timeline</Text>
        <PrimaryButton label="+ Quick Diary" onPress={() => { beginQuick(); router.push('/diaries/quick'); }} />
        {state.issue && state.failed !== 'more' && <ReadFailure issue={state.issue} retry={() => void model.retry()} />}
      </View>}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.date}, ${item.title || 'Untitled diary'}`}
        style={styles.card} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: item.id } })}>
        <Text style={styles.meta}>{civilDate(item.date)}</Text>
        <Text style={styles.title}>{item.title || 'Untitled diary'}</Text>
        {!!item.excerpt && <Text numberOfLines={3} style={styles.body}>{item.excerpt}</Text>}
        <Labels symbols={item.stockSymbols} tags={item.tags} />
        {(item.transactionCount > 0 || item.reviewStatus !== 'none') && <Text style={styles.meta}>
          {[item.transactionCount > 0 ? `${item.transactionCount} transactions` : null, item.reviewStatus !== 'none' ? `Review: ${item.reviewStatus}` : null].filter(Boolean).join(' · ')}
        </Text>}
      </Pressable>}
      ListEmptyComponent={state.phase === 'initial' ? <ReadLoading label="Loading your Timeline…" /> : !state.issue && state.phase === 'idle' ? <View style={styles.block}><Text style={styles.title}>No diaries yet</Text><Text style={styles.body}>Your journal entries will appear here.</Text></View> : null}
      ListFooterComponent={<View style={styles.block}>
        {state.issue && state.failed === 'more' ? <ReadFailure issue={state.issue} retry={() => void model.retry()} />
          : state.phase === 'more' ? <ReadLoading label="Loading more diaries…" />
          : state.hasMore ? <PrimaryButton label="Load more" disabled={state.phase !== 'idle'} onPress={() => void model.more()} />
          : state.rows.length > 0 ? <Text style={styles.meta}>You’re up to date · End of Timeline</Text> : null}
      </View>}
    />
  </SafeAreaView>;
}
