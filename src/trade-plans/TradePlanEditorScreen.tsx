import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, ScrollView, Text, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { TRADE_PLAN_STATUSES, type TradePlanResponse } from '@diary/contracts/trade-plan';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { nativeAuthoringDraftRepository } from '@/quick/native-storage';
import type { AuthoringDraft } from '@/drafts/repository';
import { leaveCopy, planCopy } from './copy';
import { emptyPlanForm, formFromPlan, parsePlanForm, planFields, type PlanForm, type PlanField } from './model';
import { PlanFailure, tradePlanService } from './service';
import { deletePlanAndDraft } from './delete';
import { PlanButton, PlanCard, PlanChoice, PlanField as Field, usePlanStyles } from './ui';

const draftSchema = z.object({ form: z.object(Object.fromEntries(planFields.map(field => [field, z.string()])) as Record<PlanField, z.ZodString>), uncertain: z.boolean() }).strict();
type DiaryOption = { id: string; title: string; date: string };

export default function TradePlanEditorScreen() {
  const { id: rawId, diaryId: rawDiaryId } = useLocalSearchParams<{ id?: string; diaryId?: string }>();
  const id = typeof rawId === 'string' && rawId !== 'new' ? rawId : null;
  const requestedDiaryId = typeof rawDiaryId === 'string' ? rawDiaryId : null;
  const { api, diaryScope, environmentKey } = useAuth(); const { locale } = usePreferences();
  const c = planCopy(locale); const leave = leaveCopy[locale]; const networkMessage = c.network; const styles = usePlanStyles();
  const navigation = useNavigation();
  const [form, setForm] = useState<PlanForm>(emptyPlanForm); const [plan, setPlan] = useState<TradePlanResponse | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false); const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]); const [saved, setSaved] = useState(false); const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false); const [dirty, setDirty] = useState(false); const [draftError, setDraftError] = useState(false);
  const [allowRemove, setAllowRemove] = useState(false);
  const [diaries, setDiaries] = useState<DiaryOption[]>([]); const [diaryPage, setDiaryPage] = useState(0); const [moreDiaries, setMoreDiaries] = useState(false);
  const [diaryFailure, setDiaryFailure] = useState(false); const [diaryChooser, setDiaryChooser] = useState(false); const [reload, setReload] = useState(0);
  const draftRevision = useRef(0); const loadGeneration = useRef(0); const saveLock = useRef(false);
  const service = useMemo(() => api && diaryScope ? tradePlanService(api, diaryScope) : null, [api, diaryScope]);
  const identity = useMemo(() => diaryScope ? { scope: environmentKey, ownerId: diaryScope.ownerId, entityType: 'trade-plan', entityId: id ?? 'new' } : null, [environmentKey, diaryScope, id]);

  useEffect(() => {
    const generation = ++loadGeneration.current; let alive = true; const controller = new AbortController();
    if (!service || !diaryScope || !identity) return () => { alive = false; controller.abort(); };
    void (async () => {
      let local: AuthoringDraft<z.infer<typeof draftSchema>> | null = null;
      try {
        local = await (await nativeAuthoringDraftRepository()).load(identity, { schemaVersion: 1, schema: draftSchema });
        const existing = id ? await service.detail(id, controller.signal) : null;
        let selected = existing ? formFromPlan(existing) : emptyPlanForm();
        if (!id && requestedDiaryId) {
          const diary = await diaryScope.detail(requestedDiaryId);
          selected = { ...selected, diaryId: diary.id };
          if (alive && generation === loadGeneration.current) setDiaries([{ id: diary.id, title: diary.title, date: diary.date }]);
        }
        if (!alive || generation !== loadGeneration.current || !diaryScope.isCurrent()) return;
        if (local) { selected = local.data.form; setUncertain(local.data.uncertain); setDirty(true); draftRevision.current = local.revision; }
        setPlan(existing); setForm(selected); setLoading(false);
      } catch {
        if (alive && generation === loadGeneration.current && diaryScope.isCurrent()) {
          if (local) { setForm(local.data.form); setUncertain(local.data.uncertain); setDirty(true); draftRevision.current = local.revision; setError(networkMessage); }
          else setLoadError(true);
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, [service, diaryScope, identity, id, requestedDiaryId, reload, networkMessage]);

  useEffect(() => {
    if (!diaryScope || !diaryChooser || diaryPage < 1) return;
    let alive = true;
    void diaryScope.summary(diaryPage, { sortBy: 'date-desc', limit: 20 }).then(page => {
      if (!alive || !diaryScope.isCurrent()) return;
      setDiaries(old => [...new Map([...old, ...page.data.map(item => ({ id: item.id, title: item.title, date: item.date }))].map(item => [item.id, item])).values()]);
      setMoreDiaries(page.pagination.page < page.pagination.totalPages);
    }).catch(() => { if (alive && diaryScope.isCurrent()) setDiaryFailure(true); });
    return () => { alive = false; };
  }, [diaryScope, diaryChooser, diaryPage, reload]);

  async function persist(next: PlanForm, uncertainValue: boolean): Promise<boolean> {
    if (!identity || !diaryScope?.isCurrent()) return false;
    const revision = ++draftRevision.current;
    try { await (await nativeAuthoringDraftRepository()).save({ ...identity, schemaVersion: 1, revision, updatedAt: new Date().toISOString(), data: { form: next, uncertain: uncertainValue } }, draftSchema); setDraftError(false); return true; }
    catch { if (diaryScope.isCurrent()) setDraftError(true); return false; }
  }
  usePreventRemove(dirty && !allowRemove, ({ data }) => {
    if (pending) { Alert.alert(leave.title, c.uncertain, [{ text: leave.stay, style: 'cancel' }]); return; }
    const navigate = () => { setAllowRemove(true); requestAnimationFrame(() => navigation.dispatch(data.action)); };
    const keep = { text: leave.keep, onPress: () => { void persist(form, uncertain).then(ok => { if (ok) navigate(); else Alert.alert(leave.title, c.draftFailure); }); } };
    const discard = { text: leave.discard, style: 'destructive' as const, onPress: () => {
      if (!identity) return;
      void nativeAuthoringDraftRepository().then(repository => repository.remove(identity)).then(() => { setDirty(false); navigate(); })
        .catch(() => Alert.alert(leave.title, c.draftFailure));
    } };
    Alert.alert(leave.title, uncertain ? leave.uncertain : leave.message,
      uncertain ? [{ text: leave.stay, style: 'cancel' }, keep] : [{ text: leave.stay, style: 'cancel' }, keep, discard]);
  });
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, []));
  function change(field: PlanField, value: string) {
    const next = { ...form, [field]: value }; setForm(next); setDirty(true); setSaved(false); setError(null); setInvalid([]);
    void persist(next, uncertain);
  }
  async function save() {
    if (!service || !identity || !diaryScope || saveLock.current || uncertain) return;
    const parsed = parsePlanForm(form);
    if (!parsed.success) { setInvalid(parsed.error.issues.map(issue => String(issue.path[0] ?? ''))); setError(parsed.error.issues.some(issue => issue.path[0] === 'entryZoneHigh') ? c.zone : c.validation); return; }
    saveLock.current = true; setPending(true); setError(null); setSaved(false);
    try {
      // Flush the exact attempt to encrypted storage before sending it.
      if (!await persist(form, false)) { setError(c.draftFailure); return; }
      const result = id ? await service.update(id, parsed.data) : await service.create(parsed.data);
      if (!diaryScope.isCurrent()) return;
      setPlan(result); setForm(formFromPlan(result)); setDirty(false); setUncertain(false); setSaved(true);
      try { await (await nativeAuthoringDraftRepository()).remove(identity); }
      catch { setDraftError(true); setError(c.draftFailure); }
      if (!id) { setAllowRemove(true); requestAnimationFrame(() => router.replace({ pathname: '/trade-plans/[id]', params: { id: result.id } })); }
    } catch (cause) {
      if (!diaryScope.isCurrent()) return;
      const uncertainResult = !(cause instanceof PlanFailure) || cause.kind === 'uncertain';
      setUncertain(uncertainResult); setError(uncertainResult ? c.uncertain : c.rejected);
      await persist(form, uncertainResult);
    } finally { saveLock.current = false; if (diaryScope.isCurrent()) setPending(false); }
  }
  function confirmDelete() {
    if (!id || !service || !identity || pending) return;
    Alert.alert(c.remove, c.confirm, [{ text: c.cancel, style: 'cancel' }, { text: c.remove, style: 'destructive', onPress: () => void remove() }]);
  }
  async function remove() {
    if (!id || !service || !identity || !diaryScope || saveLock.current) return;
    saveLock.current = true; setPending(true); setError(null);
    try {
      const outcome = await deletePlanAndDraft(() => service.remove(id), async () => (await nativeAuthoringDraftRepository()).remove(identity));
      if (!diaryScope.isCurrent()) return;
      setDirty(false);
      if (!outcome.draftCleared) { setDraftError(true); setError(`${c.deleted} ${c.draftFailure}`); return; }
      setAllowRemove(true); requestAnimationFrame(() => router.replace('/trade-plans' as Href));
    }
    catch (cause) { if (diaryScope.isCurrent()) setError(cause instanceof PlanFailure && cause.kind === 'rejected' ? c.rejected : c.deleteUncertain); }
    finally { saveLock.current = false; if (diaryScope.isCurrent()) setPending(false); }
  }
  if (!diaryScope?.isCurrent()) return null;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <PlanButton label={c.back} secondary onPress={() => router.push('/trade-plans' as Href)} />
    <Text accessibilityRole="header" style={styles.heading}>{id ? `${c.edit} · ${plan?.symbol ?? ''}` : c.new}</Text><Text style={styles.muted}>{c.hint}</Text>
    {loading ? <ActivityIndicator accessibilityLabel={c.loading} /> : loadError ? <PlanCard><Text accessibilityRole="alert" style={styles.error}>{id ? c.noPlan : c.failure}</Text><PlanButton label={c.retry} onPress={() => setReload(value => value + 1)} /></PlanCard> : <>
      {saved && <Text accessibilityRole="alert" style={styles.body}>{c.saved}</Text>}
      {dirty && <Text style={styles.muted}>{c.drafts}</Text>}{draftError && <Text accessibilityRole="alert" style={styles.error}>{c.draftFailure}</Text>}
      {plan?.diary && <PlanButton label={`${c.read}: ${plan.diary.title} · ${plan.diary.date}`} secondary onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: plan.diary!.id } })} />}
      <PlanCard><Field label={c.symbol} value={form.symbol} onChangeText={value => change('symbol', value)} autoCapitalize="characters" maxLength={32} error={invalid.includes('symbol')} />
        <Text style={styles.label}>{c.status}</Text><View style={styles.row}>{TRADE_PLAN_STATUSES.map(status => <PlanChoice key={status} label={c[status]} selected={form.status === status} onPress={() => change('status', status)} />)}</View>
        <Field label={c.setupType} value={form.setupType} onChangeText={value => change('setupType', value)} maxLength={100} />
      </PlanCard>
      <PlanCard><Text style={styles.section}>{c.levels}</Text><Text style={styles.muted}>{c.precision}</Text>
        {(['entryPrice', 'entryZoneLow', 'entryZoneHigh', 'stopLoss', 'targetPrice', 'maxPositionSize'] as const).map(field => <Field key={field} label={c[field]} value={form[field]} onChangeText={value => change(field, value)} keyboardType="decimal-pad" maxLength={32} error={invalid.includes(field)} />)}
      </PlanCard>
      <PlanCard><Text style={styles.section}>{c.context}</Text><Text style={styles.label}>{c.diaryId}</Text>
        <Text style={styles.body}>{form.diaryId ? diaries.find(item => item.id === form.diaryId)?.title ?? plan?.diary?.title ?? form.diaryId : c.none}</Text>
        <View style={styles.row}><PlanButton label={c.chooseDiary} secondary onPress={() => { setDiaryChooser(value => !value); if (diaryPage === 0) setDiaryPage(1); }} /><PlanButton label={c.unlink} secondary disabled={!form.diaryId} onPress={() => change('diaryId', '')} /></View>
        {diaryChooser && <View style={{ gap: 8 }}>{diaries.length === 0 && !diaryFailure && <Text style={styles.muted}>{c.noDiary}</Text>}
          {diaries.map(item => <PlanChoice key={item.id} label={`${item.title} · ${item.date}`} selected={form.diaryId === item.id} onPress={() => { change('diaryId', item.id); setDiaryChooser(false); }} />)}
          {diaryFailure && <><Text accessibilityRole="alert" style={styles.error}>{c.diaryFailure}</Text><PlanButton label={c.retry} onPress={() => { setDiaryFailure(false); setReload(value => value + 1); }} /></>}
          {moreDiaries && <PlanButton label={c.diaries} secondary onPress={() => setDiaryPage(value => value + 1)} />}</View>}
        <Field label={c.invalidationCondition} value={form.invalidationCondition} onChangeText={value => change('invalidationCondition', value)} multiline maxLength={5000} />
        <Field label={c.notes} value={form.notes} onChangeText={value => change('notes', value)} multiline maxLength={10000} />
      </PlanCard>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {uncertain ? <PlanButton label={c.continue} secondary onPress={() => { setUncertain(false); void persist(form, false); }} /> : <PlanButton label={c.save} onPress={() => void save()} disabled={pending || draftError} testID="plan-save" />}
      {!!id && <PlanButton label={c.remove} secondary onPress={confirmDelete} disabled={pending} testID="plan-delete" />}
    </>}
  </ScrollView></SafeAreaView>;
}
