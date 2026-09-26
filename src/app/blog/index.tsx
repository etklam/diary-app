import { Redirect, type Href } from 'expo-router';

export default function LegacyBlogIndex() { return <Redirect href={'/articles' as Href} />; }
