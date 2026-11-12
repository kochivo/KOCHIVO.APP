import type { TemplateKind } from './types';

export function templateEditorHref(kind: TemplateKind, id: string, workspace: boolean) {
  return workspace && kind === 'program' ? `/captain/templates?plan=${encodeURIComponent(id)}`
    : `/captain/${kind === 'program' ? 'programs' : 'nutrition'}/${id}`;
}
