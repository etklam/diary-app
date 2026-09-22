import { router } from 'expo-router';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
export default function PublicStart() {
  return <AccountPage title="Start"><Copy>Keep your observations, decisions and later reflections together.</Copy>
    <PrimaryButton label="Guide" onPress={() => router.push('/guide')} />
    <Copy>Sign in before writing. You will review and save your diary yourself.</Copy>
    <PrimaryButton testID="guest-write" label="Write a diary" onPress={() => router.push({ pathname: '/', params: { returnTo: '/diaries/quick' } })} />
    <Copy>Public tools and articles are being added.</Copy>
  </AccountPage>;
}
