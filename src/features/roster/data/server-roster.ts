import 'server-only';
// Server callers import this leaf so the roster barrel's client components stay out of their routes.
export { fetchRoster } from './roster';
export { playerStatus } from '../status';
