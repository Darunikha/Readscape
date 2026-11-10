import { Link } from 'react-router';
import { EmptyState } from '../components/ui';
import { BookStack } from '../components/decor/Decor';

export default function NotFound() {
  return (
    <EmptyState
      className="mt-10"
      illustration={<BookStack className="w-44" tones={['mist', 'rose', 'silver']} ribbon />}
      title="This page wandered off the shelf"
      message="We couldn’t find what you were looking for."
      action={<Link to="/" className="btn-primary">Back home</Link>}
    />
  );
}
