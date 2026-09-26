import { router, type Href } from 'expo-router';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
export default function PublicStart() {
  return <AccountPage title="Start"><Copy>Keep your observations, decisions and later reflections together.</Copy>
    <PrimaryButton label="Guide" onPress={() => router.push('/guide')} />
    <PrimaryButton label="Browse articles" onPress={() => router.push('/articles' as Href)} />
    <PrimaryButton label="About and support" onPress={() => router.push('/about' as Href)} />
    <PrimaryButton label="Explore public tools" onPress={() => router.push('/tools' as Href)} />
    <Copy>Sign in before writing. You will review and save your diary yourself.</Copy>
    <PrimaryButton testID="guest-write" label="Write a diary" onPress={() => router.push({ pathname: '/', params: { returnTo: '/diaries/quick' } })} />
  </AccountPage>;
}
