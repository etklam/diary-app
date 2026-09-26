import { useInstantDate , usePreferences } from '@/preferences/context';

import { Markdown } from '@/markdown/reader';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { useDiaryStyles, Labels, ReadFailure, ReadLoading } from '@/components/diary-ui';
import type { DiaryReadScope } from '@/diaries/access';
import { civilDate } from '@/diaries/dates';
import { createDetailState } from '@/diaries/state';
import { planCopy } from '@/trade-plans/copy';

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { diaryScope } = useAuth();
  const diaryId = typeof id === 'string' ? id : '';
  return diaryScope ? <Detail key={`${diaryScope.ownerId}:${diaryId}`} scope={diaryScope} id={diaryId} /> : null;
}

function Detail({ scope, id }: { scope: DiaryReadScope; id: string }) {
  const instantDate = useInstantDate();
  const { t, locale } = usePreferences();
  const planText = planCopy(locale);
  const styles = useDiaryStyles();
  const { diaryMutation, reviews, diaryEditor } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; void reviews?.hasDraft(id).then(value => { if (active) setHasDraft(value); }).catch(() => {}); return () => { active = false; }; }, [reviews, id]));
  const [hasEditorDraft, setHasEditorDraft] = useState(false);
  useFocusEffect(useCallback(() => { let active = true; void diaryEditor?.hasDraft(id).then(value => { if (active) setHasEditorDraft(value); }).catch(() => {}); return () => { active = false; }; }, [diaryEditor, id]));
  const model = useMemo(() => createDetailState(scope), [scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useFocusEffect(useCallback(() => { void model.load(id, diaryMutation); return model.cancel; }, [model, id, diaryMutation]));
  if (!scope.isCurrent()) return null;
  const diary = state.diary;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      {state.loading && <ReadLoading label={t("Loading diary…")} />}
      {state.issue && state.savedRefresh && <Text style={styles.meta}>{t("Saved, but refreshing this diary failed. Retry reading; no review will be submitted again.")}</Text>}
      {state.issue && <ReadFailure issue={state.issue} retry={() => void model.load(id, diaryMutation)} />}
      {diary && <>
        <Text style={styles.meta}>{civilDate(diary.date)}</Text>
        <Text selectable style={styles.heading}>{diary.title || t('Untitled diary')}</Text>
        <PrimaryButton label={hasEditorDraft ? 'Resume diary draft' : 'Edit diary'} onPress={() => router.push({ pathname: '/diaries/editor', params: { id } } as unknown as Href)} />
        <PrimaryButton label={hasDraft ? 'Resume review draft' : diary.reviewStatus === 'reviewed' ? 'Edit review' : 'Write review'} onPress={() => router.push({ pathname: '/diaries/review', params: { id } })} />
        <PrimaryButton label={`${planText.new} · ${diary.title || t('Untitled diary')}`} onPress={() => router.push({ pathname: '/trade-plans/new', params: { diaryId: id } } as Href)} />
        {!!diary.tradePlans?.length && <View style={styles.block}>
          <Text style={styles.title}>{planText.title}</Text>
          {diary.tradePlans.map(plan => <PrimaryButton key={plan.id} label={`${planText.edit}: ${plan.symbol} · ${planText[plan.status]}`} onPress={() => router.push({ pathname: '/trade-plans/[id]', params: { id: plan.id } } as Href)} />)}
        </View>}
        {diary.reviewedAt && <Text style={styles.meta}>{t("Review last saved")}{' '}{instantDate(diary.reviewedAt)}</Text>}
        <Labels symbols={diary.stockSymbols} tags={diary.tags} />
        <Markdown>{diary.content || 'No diary text.'}</Markdown>
        {!!diary.transactions?.length && <View style={styles.block}>
          <Text style={styles.title}>{t('Transactions')}</Text>
          {diary.transactions.map(transaction => <View key={transaction.id} style={styles.card}>
            <Text style={styles.title}>{t(transaction.type === 'BUY' ? 'Purchase' : 'Sale')} · {transaction.symbol}</Text>
            <Text style={styles.meta}>{t('Quantity')}: {transaction.quantity} · {t('Price per share')}: {transaction.price}</Text>
            <Text style={styles.meta}>{t('Trade date and time (account timezone)')}: {instantDate(transaction.tradeDate)}</Text>
            {!!transaction.strategy && <Text style={styles.meta}>{t('Strategy')}: {transaction.strategy}</Text>}
            {!!transaction.emotion && <Text style={styles.meta}>{t('Emotion')}: {t(transaction.emotion)}</Text>}
            {!!transaction.notes && <Text style={styles.meta}>{t('Trade notes')}: {transaction.notes}</Text>}
          </View>)}
        </View>}
        {(['thesis', 'risk', 'execution', 'reviewSummary', 'reviewLearning', 'reviewAdjustment'] as const).map(field => diary[field] ? <View key={field} style={styles.block}>
          <Text style={styles.title}>{t({ thesis: 'Thesis', risk: 'Risk', execution: 'Execution', reviewSummary: 'Review summary', reviewLearning: 'Learning', reviewAdjustment: 'Adjustment' }[field])}</Text>
          <Markdown>{diary[field]}</Markdown>
        </View> : null)}
        <View style={styles.card}>
          <Text style={styles.meta}>{t("Created")}{' '}{instantDate(diary.createdAt)}</Text>
          <Text style={styles.meta}>{t("Updated")}{' '}{instantDate(diary.updatedAt)}</Text>
          <Text style={styles.meta}>{t("Source:")}{' '}{diary.createdByLabel || diary.createdVia}</Text>
          {!!diary.transactions?.length && <Text style={styles.meta}>{diary.transactions.length} {t("transactions")}</Text>}
          {diary.reviewStatus && diary.reviewStatus !== 'none' && <Text style={styles.meta}>{t("Review:")}{' '}{t({ none: 'No review', pending: 'Pending review', reviewed: 'Reviewed' }[diary.reviewStatus])}</Text>}
          {diary.reviewDueAt && <Text style={styles.meta}>{t("Review due")}{' '}{instantDate(diary.reviewDueAt)}</Text>}
          {diary.reviewOutcome && <Text style={styles.meta}>{t("Outcome:")}{' '}{t(diary.reviewOutcome)}</Text>}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
