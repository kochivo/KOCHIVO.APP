import { Chat } from './chat';
import { Roster } from './roster';
import { PlayerFile } from './player-file';
import { Programs } from './programs';
import { Meals } from './meals';
import { Assessment } from './assessment';
import { Money } from './money';
import { Invite } from './invite';
import type { PaneProps } from './types';

export function CaptainViews(props: PaneProps) {
  switch (props.state.page) {
    case 'inbox': return <Chat {...props} />;
    case 'players': return <Roster {...props} />;
    case 'player': return <PlayerFile {...props} />;
    case 'programs': return <Programs {...props} />;
    case 'food': return <Meals {...props} />;
    case 'assess': return <Assessment {...props} />;
    case 'money': return <Money {...props} />;
    case 'add': return <Invite {...props} />;
    default: return null;
  }
}
