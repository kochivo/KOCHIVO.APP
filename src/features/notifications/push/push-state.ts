interface PushState {
  on: boolean;
  denied: boolean;
  status: 'loading' | 'saving' | 'ready' | 'error';
}
type PushAction = { type: 'loaded'; on: boolean; denied: boolean }
  | { type: 'loading' | 'saving' | 'failed' };
export const initialPushState: PushState = { on: false, denied: false, status: 'loading' };

export function pushReducer(state: PushState, action: PushAction): PushState {
  if (action.type === 'loaded') return { on: action.on, denied: action.denied, status: 'ready' };
  return { ...state, status: action.type === 'failed' ? 'error' : action.type };
}
