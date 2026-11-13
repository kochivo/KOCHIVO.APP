import 'server-only';
// Server routes read these without importing the player-home barrel, whose client entries would join every route's bundle.
export { messages as playerHomeMessages } from '../messages';
export { fetchPlayerIdentity } from './player-identity';
