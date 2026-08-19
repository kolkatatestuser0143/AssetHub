import AppErrorState from '../../components/feedback/AppErrorState';

export default function SystemNotFound() {
  return <AppErrorState homeHref="/system" title="System page not found" message="The platform area you requested is not available or may have moved." />;
}
