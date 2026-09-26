import { router, type Href } from 'expo-router';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
import { HelpButton } from '@/beta/help';

export default function About() {
  return <AccountPage title="About Trade Basic">
    <Copy>Trade Basic is a private investing journal for recording observations, decisions and later reviews, with public research tools and articles alongside it.</Copy>
    <Copy>Use your account to save Diaries and preferences. Public articles and tools can be explored as a guest. Saved records belong to the signed-in account; drafts remain encrypted on this device until you explicitly save.</Copy>
    <Copy>Market and SEC data are provided for research context, can be delayed or unavailable, and are not personal investment advice. Check the displayed source and date before relying on a reading.</Copy>
    <Copy>For account, support, data-retention, deletion and diagnostic information, open Help and support. Review a diagnostic summary before choosing to share it.</Copy>
    <PrimaryButton label="Read the guide" onPress={() => router.push('/guide' as Href)} />
    <PrimaryButton label="Browse articles" onPress={() => router.push('/articles' as Href)} />
    <HelpButton screen="root" />
  </AccountPage>;
}
