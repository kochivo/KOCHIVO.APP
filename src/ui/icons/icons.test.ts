import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as icons from './index';

describe('engraved icons', () => {
  it('exports all twenty glyphs', () => {
    expect(Object.keys(icons).sort()).toEqual([
      'KoBilling', 'KoCamera', 'KoCaptainChat', 'KoFollowup', 'KoFoods', 'KoForms', 'KoGallery',
      'KoHome', 'KoInvite', 'KoMealPlans', 'KoMic', 'KoPlay', 'KoPlayerFood', 'KoPlayers',
      'KoPlus', 'KoProgress', 'KoSend', 'KoSettings', 'KoTemplate', 'KoTraining',
    ]);
  });

  for (const [name, Icon] of Object.entries(icons)) {
    it(`${name} renders accessible, unique hatching in repeated instances`, () => {
      const html = renderToStaticMarkup(createElement(Fragment, null, createElement(Icon), createElement(Icon)));
      const ids = [...html.matchAll(/<pattern id="([^"]+)"/g)].map(match => match[1]);
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
      for (const id of ids) expect(html).toContain(`fill="url(#${id})"`);
      expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
      expect(html.match(/focusable="false"/g)).toHaveLength(2);
      expect(html.match(/stroke-width="0.8"/g)).toHaveLength(2);
      expect(html).toContain('patternTransform="rotate(45)"');
      expect(html).toContain('width="2.2"');
      expect(html).toContain('stroke-width="0.7"');
      expect(html).toContain('stroke-width="1.5"');
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('text-ivory-muted');
      expect(html).toContain('text-ivory-hatch');
      expect(html).not.toContain('text-lime');
    });

    it(`${name} switches hatch and accent outline to lime when active`, () => {
      const html = renderToStaticMarkup(createElement(Icon, { active: true, className: 'size-5' }));
      expect(html).toContain('text-ivory');
      expect(html.match(/class="text-lime"/g)).toHaveLength(2);
      expect(html).not.toContain('text-ivory-muted');
      expect(html).not.toContain('text-ivory-hatch');
      expect(html).not.toContain('active=');
    });
  }

  it('forwards SVG accessibility and event props without mirroring directional send', () => {
    const html = renderToStaticMarkup(createElement('div', { dir: 'rtl' }, createElement(icons.KoSend, {
      'aria-hidden': false, 'aria-label': 'Send', role: 'img', className: 'size-6',
    })));
    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain('aria-label="Send"');
    expect(html).toContain('role="img"');
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('scaleX');
    expect(html).toContain('stroke-width="0.9"');
  });
});
