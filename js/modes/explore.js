// Mode Jelajah: bebas mencoba; deskripsi lengkap & tabel koordinat tampil langsung.
import { h, fill } from '../core/dom.js';
import { SHAPES, shift, labels } from '../geometry/shapes.js';
import { describe, fmtPt } from '../geometry/describe.js';
import { apply } from '../geometry/transforms.js';
import { STR } from '../i18n/strings.js';

export const explore = {
  id: 'explore',
  usesManipulator: true,
  showShapePicker: true,

  mount(ctx) {
    this.ctx = ctx;
    this.shapeId = this.shapeId || 'triangle';
    ctx.setObject(shift(SHAPES[this.shapeId].pts, 1, 1));
    ctx.manip.enabled = true;
    ctx.manip.reset();
  },

  setShape(id) {
    this.shapeId = id;
    this.ctx.setObject(shift(SHAPES[id].pts, 1, 1));
    this.ctx.manip.reset();
  },

  render(panel) {
    const { ctx } = this;
    const { t, lang, other, manip, object } = ctx;
    fill(panel, 
      h('h2', {}, t('explore_title')),
      h('p', { class: 'hint' }, STR.per_type_help[lang][manip.type]),
    );
    if (!manip.touched) {
      panel.append(h('p', { class: 'muted' }, t('no_change')));
      return;
    }
    const img = apply(manip.t, object);
    panel.append(
      h('div', { class: 'desc', 'aria-live': 'polite' },
        h('div', { class: 'desc-main', html: describe(manip.t, lang) }),
        h('div', { class: 'desc-alt', html: describe(manip.t, other) })),
      h('h3', {}, t('coords')),
      h('table', { class: 'coords' },
        h('tbody', {}, ...object.map((p, i) =>
          h('tr', {},
            h('td', { class: 'c-obj' }, `${labels(object.length)[i]} ${fmtPt(p)}`),
            h('td', { class: 'arrow' }, '→'),
            h('td', { class: 'c-img' }, `${labels(object.length, 1)[i]} ${fmtPt(img[i])}`))))),
    );
  },
};
