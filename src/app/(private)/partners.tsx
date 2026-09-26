import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AccountPage, Field, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { createPartnerManager } from '@/partners/manager';
import { partnerService } from '@/partners/service';
import type { PartnerLinkResponse } from '@diary/contracts/partners';

export default function PartnersScreen() {
  const { api, diaryScope } = useAuth();
  if (!api || !diaryScope) return null;
  return <PartnerOwner key={diaryScope.ownerId} api={api} scope={diaryScope} />;
}

function PartnerOwner({ api, scope }: { api: NonNullable<ReturnType<typeof useAuth>['api']>; scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']> }) {
  const model = useMemo(() => createPartnerManager(partnerService(api, scope), scope.isCurrent), [api, scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const { colors: c, t } = usePreferences();
  const { retryVerification } = useAuth();
  const [email, setEmail] = useState('');
  const locked = state.busy || state.mutationUncertain || state.error?.kind === 'session';

  useEffect(() => () => model.dispose(), [model]);
  useFocusEffect(useCallback(() => { void model.refresh(); }, [model]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => { if (next === 'active' && scope.isCurrent()) void model.refresh(false); });
    return () => subscription.remove();
  }, [model, scope]);

  async function invite() { if (await model.invite(email)) setEmail(''); }
  async function verify() { await retryVerification(); if (scope.isCurrent()) await model.refresh(); }
  function remove(link: PartnerLinkResponse) {
    Alert.alert(t('Remove this invitation or connection?'), t('Sharing through this connection will stop.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Remove connection'), style: 'destructive', onPress: () => { void model.remove(link.id); } },
    ]);
  }

  return <AccountPage title="Partners">
    <Copy>Connect with another account. Each person chooses what to share.</Copy>
    <Copy>Accepting an invitation keeps sharing off. You can separately allow your partner to read your Diaries or Stock Notes.</Copy>
    {state.error?.kind === 'uncertain' && <StatusMessage tone="warning">The change may have reached the server. Refresh partners before making another change; no write was repeated.</StatusMessage>}
    {state.error?.kind === 'session' && <StatusMessage tone="warning">Your session needs verification before partner settings can be changed.</StatusMessage>}
    {state.error?.kind === 'rejected' && <StatusMessage tone="error">{state.error.code === 'SYS_VALIDATION_ERROR' ? 'Enter a valid partner email.' : state.error.code === 'PARTNER_LINK_ALREADY_EXISTS' ? 'An invitation or connection already exists for this account.' : state.error.code === 'PARTNER_LINK_PENDING' ? 'Accept the invitation before changing sharing.' : 'The request was rejected. Refresh and check the current partner state.'}</StatusMessage>}
    {state.error?.kind === 'stale' && <StatusMessage tone="warning">The account changed. Reopen this screen to load current partner settings.</StatusMessage>}
    {state.saved && <StatusMessage tone="warning">Partner settings updated.</StatusMessage>}
    {state.error?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={() => void verify()} />}
    {state.error && <PrimaryButton testID="partners-refresh" label="Refresh partners" busy={state.loading} disabled={state.busy} onPress={() => void model.refresh()} />}

    {state.links && <>
      <Field label="Partner email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" maxLength={255} editable={!locked} />
      <PrimaryButton testID="partner-invite" label="Invite partner" busy={state.busy} disabled={!email.trim() || locked} onPress={() => void invite()} />
    </>}
    {!state.links && state.loading && <Copy>Loading partners…</Copy>}
    {!state.links && state.error && <Copy>Could not load partner settings. Refresh to try again.</Copy>}
    {state.links && !state.links.length && <Copy>No partners yet.</Copy>}
    <View accessibilityRole="list" style={{ gap: 12 }}>
      {state.links?.map(link => <View key={link.id} testID={`partner-${link.id}`} style={{ padding: 16, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{link.partner.name || link.partner.email}</Text>
        {link.partner.name && <Text style={{ color: c.muted, fontSize: 15 }}>{link.partner.email}</Text>}
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 16 }}>{t(link.status === 'connected' ? 'Connected' : link.status === 'pending_incoming' ? 'Invitation received' : 'Awaiting acceptance')}</Text>
        {link.status === 'connected' ? <>
          <View style={{ paddingTop: 6, gap: 4 }}>
            <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>{t('What I share')}</Text>
            <Copy>{`${t('Diaries')}: ${t(link.selfSharesDiaries ? 'Shared' : 'Private')} · ${t('Stock notes')}: ${t(link.selfSharesStockNotes ? 'Shared' : 'Private')}`}</Copy>
          </View>
          <PrimaryButton testID={`partner-share-diaries-${link.id}`} label={link.selfSharesDiaries ? 'Stop sharing my Diaries' : 'Share my Diaries'} disabled={locked} onPress={() => void model.setSharing(link.id, 'shareDiaries', !link.selfSharesDiaries)} />
          <PrimaryButton testID={`partner-share-notes-${link.id}`} label={link.selfSharesStockNotes ? 'Stop sharing my Stock Notes' : 'Share my Stock Notes'} disabled={locked} onPress={() => void model.setSharing(link.id, 'shareStockNotes', !link.selfSharesStockNotes)} />
          <View style={{ paddingTop: 6, gap: 4 }}>
            <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>{t('What they share')}</Text>
            <Copy>{`${t('Diaries')}: ${t(link.partnerSharesDiaries ? 'Shared' : 'Private')} · ${t('Stock notes')}: ${t(link.partnerSharesStockNotes ? 'Shared' : 'Private')}`}</Copy>
          </View>
        </> : link.status === 'pending_incoming' ? <PrimaryButton testID={`partner-accept-${link.id}`} label="Accept invitation" disabled={locked} onPress={() => void model.accept(link.id)} /> : <Copy>This invitation is waiting for the other account. Sharing is not active.</Copy>}
        <PrimaryButton testID={`partner-remove-${link.id}`} label="Remove connection" disabled={locked} onPress={() => remove(link)} />
      </View>)}
    </View>
  </AccountPage>;
}
