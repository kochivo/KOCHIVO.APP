import { LoadingState } from './loading-state';

export function RouteLoading() {
  return <div className="enter mx-auto w-full min-w-0 max-w-screen-2xl space-y-5 p-4">
    <LoadingState variant="cards" className="min-h-40" />
    <LoadingState className="min-h-96" />
  </div>;
}
