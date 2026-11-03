import { PlanBuilder } from '@/features/meal-plans';

export default async function Page({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  return <PlanBuilder planId={planId} />;
}
