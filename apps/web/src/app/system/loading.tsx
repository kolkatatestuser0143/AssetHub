import { LoadingSkeleton } from '../../components/loading-state';

export default function Loading() {
  return <LoadingSkeleton fullPage rows={6} label="Loading content" />;
}
