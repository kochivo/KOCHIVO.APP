export interface PlayerBalance {
  id: string;
  access_until: string;
  sessions_left: number | null;
  frozen_at: string | null;
  pending: boolean;
}
export interface Activation {
  packageId: string | null;
  kind: 'days' | 'sessions';
  quantity: number;
  price: number;
  paid: number;
  freeTrial: boolean;
}
