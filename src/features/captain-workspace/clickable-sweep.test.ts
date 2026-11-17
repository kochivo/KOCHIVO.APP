import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import ts from 'typescript';

const sources = [
  'queue/task-row.tsx', 'queue/tasks-screen.tsx',
  'library/exercise-detail.tsx', 'library/exercise-library.tsx',
  'training/day-rail.tsx', 'training/warmup-block.tsx',
  '../inbox/components/workspace-row.tsx', '../inbox/components/workspace-controls.tsx',
  '../rank-review/components/workspace-board-list.tsx',
  '../settings/components/workspace-page-card.tsx', '../settings/components/workspace-preferences.tsx',
  '../meal-plans/components/v11-foods-table.tsx',
  '../meal-plans/components/foods-library-entry.tsx', '../meal-plans/components/v11-assign-dialog.tsx',
  '../billing/components/workspace-payments-table.tsx', '../billing/components/workspace-billing.tsx',
];

it.each(sources)('keeps shared click feedback on custom v11 controls in %s', file => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let controls = 0;
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      if (['button', 'summary', 'Link', 'a', 'input', 'select', 'textarea'].includes(tag)) {
        const attributes = node.attributes.properties;
        const classes = attributes.find(a => ts.isJsxAttribute(a) && a.name.getText(tree) === 'className')?.getText(tree) ?? '';
        const disabled = attributes.some(a => ts.isJsxAttribute(a) && a.name.getText(tree) === 'disabled' && !a.initializer);
        if (!disabled && !classes.includes('"hidden"')) {
          controls++;
          const shared = /clickableClass|rowLinkClass|secondaryButtonClass|buttonClass|editableFieldClass|editorButton/.test(classes);
          const explicit = ['press', 'cursor-pointer', 'focus-visible:', 'hover:'].every(cue => classes.includes(cue));
          expect(shared || explicit, `${file}: ${tag} at line ${tree.getLineAndCharacterOfPosition(node.pos).line + 1}`).toBe(true);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  expect(controls).toBeGreaterThan(0);
});

it('uses native accessible disclosures for the meal editor secondary panels', () => {
  const source = readFileSync(new URL('../meal-plans/components/editor/player-editor.tsx', import.meta.url), 'utf8');
  expect(source).toContain('<Disclosure label={t(\'more\')}');
  expect(source).toContain('<Disclosure label={t(\'library\')}');
});

it.each([
  '../billing/components/activate-sheet.tsx', '../billing/components/packages-card.tsx', '../billing/components/payment-method-picker.tsx',
  '../forms/components/assessment-fields.tsx', '../forms/components/question-rules.tsx', '../forms/components/themed-select.tsx',
  '../meal-plans/components/food-form.tsx', '../meal-plans/components/food-units-editor.tsx', '../meal-plans/components/household-quantity.tsx',
  '../meal-plans/components/meal-editor.tsx', '../meal-plans/components/targets-bar.tsx', '../meal-plans/components/foods-library-entry.tsx',
  '../meal-plans/components/library/food-drawer.tsx', '../meal-plans/components/library/food-units.tsx',
  '../settings/components/captain-profile-fields.tsx', '../settings/components/timezone-fields.tsx',
  '../settings/components/payment-method-row.tsx', '../settings/components/invite-message-form.tsx',
])('limits shared legacy control changes to the workspace path in %s', file => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'className' && node.initializer) {
      const expression = node.initializer.getText(tree);
      if (/clickableClass|editableFieldClass|secondaryButtonClass/.test(expression)) {
        expect(expression, file).toContain('captainWorkspaceEnabled() ?');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
});
