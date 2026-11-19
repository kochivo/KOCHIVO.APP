import 'server-only';
// Server-only entry: keeps client screens out of routes that only need the data.
export { fetchPlayerPreview } from './data/preview';
