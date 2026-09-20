import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { diaryStyles as styles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import type { DiaryReadScope } from '@/diaries/access';
import { civilDate, instantDate } from '@/diaries/dates';
import { createDetailState } from '@/diaries/state';

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { diaryScope } = useAuth();
  const diaryId = typeof id === 'string' ? id : '';
  return diaryScope ? <Detail key={`${diaryScope.ownerId}:${diaryId}`} scope={diaryScope} id={diaryId} /> : null;
}

function Detail({ scope, id }: { scope: DiaryReadScope; id: string }) {
  const { diaryMutation, reviews } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; void reviews?.hasDraft(id).then(value => { if (active) setHasDraft(value); }).catch(() => {}); return () => { active = false; }; }, [reviews, id]));
  const model = useMemo(() => createDetailState(scope), [scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useFocusEffect(useCallback(() => { void model.load(id, diaryMutation); return model.cancel; }, [model, id, diaryMutation]));
  if (!scope.isCurrent()) return null;
  const diary = state.diary;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      {state.loading && <ReadLoading label="Loading diary…" />}
      {state.issue && state.savedRefresh && <Text style={styles.meta}>Saved, but refreshing this diary failed. Retry reading; no review will be submitted again.</Text>}
      {state.issue && <ReadFailure issue={state.issue} retry={() => void model.load(id, diaryMutation)} />}
      {diary && <>
        <Text style={styles.meta}>{civilDate(diary.date)}</Text>
        <Text selectable style={styles.heading}>{diary.title || 'Untitled diary'}</Text>
        <PrimaryButton label={hasDraft ? 'Resume review draft' : diary.reviewStatus === 'reviewed' ? 'Edit review' : 'Write review'} onPress={() => router.push({ pathname: '/diaries/review', params: { id } })} />
        {diary.reviewedAt && <Text style={styles.meta}>Review last saved {instantDate(diary.reviewedAt)}</Text>}
        <Labels symbols={diary.stockSymbols} tags={diary.tags} />
        <Text selectable style={styles.body}>{diary.content || 'No diary text.'}</Text>
        {(['thesis', 'risk', 'execution', 'reviewSummary', 'reviewLearning', 'reviewAdjustment'] as const).map(field => diary[field] ? <View key={field} style={styles.block}>
          <Text style={styles.title}>{{ thesis: 'Thesis', risk: 'Risk', execution: 'Execution', reviewSummary: 'Review summary', reviewLearning: 'Learning', reviewAdjustment: 'Adjustment' }[field]}</Text>
          <Text selectable style={styles.body}>{diary[field]}</Text>
        </View> : null)}
        <View style={styles.card}>
          <Text style={styles.meta}>Created {instantDate(diary.createdAt)}</Text>
          <Text style={styles.meta}>Updated {instantDate(diary.updatedAt)}</Text>
          <Text style={styles.meta}>Source: {diary.createdByLabel || diary.createdVia}</Text>
          {!!diary.transactions?.length && <Text style={styles.meta}>{diary.transactions.length} transactions</Text>}
          {diary.reviewStatus && diary.reviewStatus !== 'none' && <Text style={styles.meta}>Review: {diary.reviewStatus}</Text>}
          {diary.reviewDueAt && <Text style={styles.meta}>Review due {instantDate(diary.reviewDueAt)}</Text>}
          {diary.reviewOutcome && <Text style={styles.meta}>Outcome: {diary.reviewOutcome}</Text>}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
