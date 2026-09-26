import { useLocalSearchParams } from 'expo-router';
import { SecFilingDetailScreen } from '@/tools/SecFilingDetailScreen';

export default function SecFilingDetailRoute() {
  const { cik, accession } = useLocalSearchParams<{ cik?: string; accession?: string }>();
  return <SecFilingDetailScreen cik={typeof cik === 'string' ? cik : ''} accession={typeof accession === 'string' ? accession : ''} />;
}
