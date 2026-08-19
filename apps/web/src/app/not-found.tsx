import AppErrorState from '../components/feedback/AppErrorState';

export default function NotFound() {
  return <AppErrorState title="Page not found" message="The page you requested is not available or may have moved." />;
}
