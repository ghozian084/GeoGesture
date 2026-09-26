// Mode Detektif: diberi objek & bayangan, siswa menulis deskripsi LENGKAP. Dinilai dengan rubrik per unsur.
import { h, parseNum, fill } from '../core/dom.js';
import { makeProblem } from '../geometry/generator.js';
import { apply, compareParts, TYPES } from '../geometry/transforms.js';
import { describe } from '../geometry/describe.js';
import { labels } from '../geometry/shapes.js';

const EMPTY = { type: '', cx: '', cy: '', angle: '', dir: '', lineO: '', k: '', a: '', b: '', factor: '' };

export const detective = {
  id: 'detective',
  usesManipulator: false,

  mount(ctx) {
    this.ctx = ctx;
    this.newProblem();
  },

  newProblem() {
    const { ctx } = this;
    this.p = makeProblem({ level: ctx.level, steps: 1 });
    this.form = { ...EMPTY };
    this.result = null;
    this.preview = null;
    this.reveal = false;
    this.error = '';
    ctx.manip.enabled = false;
    ctx.manip.reset();
    ctx.setObject(this.p.shape);
    this.updateExtras();
  },

  updateExtras() {
    const n = this.p.shape.length;
    const extras = [{ pts: this.p.image, kind: 'image', labels: labels(n, 1) }];
    if (this.preview) extras.push({ pts: apply(this.preview, this.p.shape), kind: 'preview' });
    this.ctx.setExtras(extras);
  },

  /** Isian → objek transformasi (null jika belum lengkap). */
  build() {
    const f = this.form;
    const n = (s) => parseNum(s);
    const ok = (...xs) => xs.every((x) => Number.isFinite(x));
    switch (f.type) {
      case 'translation': { const a = n(f.a), b = n(f.b); return ok(a, b) ? { type: f.type, v: { x: a, y: b } } : null; }
      case 'rotation': {
        const cx = n(f.cx), cy = n(f.cy), ang = n(f.angle);
        if (!ok(cx, cy, ang) || (!f.dir && ang !== 180)) return null;
        return { type: f.type, c: { x: cx, y: cy }, angle: f.dir === 'cw' ? -ang : ang };
      }
      case 'reflection': { const k = n(f.k); return f.lineO && ok(k) ? { type: f.type, line: { o: f.lineO, k } } : null; }
      case 'enlargement': {
        const cx = n(f.cx), cy = n(f.cy), k = n(f.factor);
        return ok(cx, cy, k) && k !== 0 ? { type: f.type, c: { x: cx, y: cy }, k } : null;
      }
    }
    return null;
  },

  check() {
    const s = this.build();
    if (!s) { this.error = this.ctx.t('fill_all'); this.ctx.rerender(); return; }
    this.error = '';
    this.preview = s;
    this.result = compareParts(s, this.p.transforms[0], this.p.shape);
    this.updateExtras();
    this.ctx.score(this.result.equivalent);
    if (this.result.equivalent) this.ctx.celebrate();
    this.ctx.rerender();
  },

  test() {
    const s = this.build();
    if (!s) { this.error = this.ctx.t('fill_all'); this.ctx.rerender(); return; }
    this.error = '';
    this.preview = s;
    this.updateExtras();
    this.ctx.rerender();
  },

  render(panel) {
    const { ctx } = this;
    const { t, term, lang } = ctx;
    const f = this.form;
    const bind = (key, extra = {}) => ({
      value: f[key],
      oninput: (e) => { f[key] = e.target.value; },
      ...extra,
    });
    const num = (key, label, w = '4.2em') => h('label', { class: 'fld' }, h('span', { html: label }),
      h('input', bind(key, { inputmode: 'decimal', style: `width:${w}`, autocomplete: 'off' })));
    const sel = (key, opts, onchange) => {
      const s = h('select', { onchange: (e) => { f[key] = e.target.value; onchange?.(); } },
        ...opts.map(([v, txt]) => h('option', { value: v, selected: f[key] === v }, txt)));
      return s;
    };

    const fields = [];
    switch (f.type) {
      case 'translation':
        fields.push(h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('vector') }), num('a', 'x'), num('b', 'y')));
        break;
      case 'rotation':
        fields.push(
          h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('centre') }), num('cx', 'x'), num('cy', 'y')),
          h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('angle') }),
            sel('angle', [['', t('choose')], ['90', '90°'], ['180', '180°'], ['270', '270°']])),
          h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('direction') }),
            sel('dir', [['', t('choose')], ['ccw', t('anticlockwise')], ['cw', t('clockwise')]])));
        break;
      case 'reflection':
        fields.push(h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('line') }),
          sel('lineO', [['', t('choose')], ['v', 'x = k'], ['h', 'y = k'], ['d1', 'y = x + k'], ['d2', 'y = −x + k']]),
          num('k', 'k')));
        break;
      case 'enlargement':
        fields.push(
          h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('centre') }), num('cx', 'x'), num('cy', 'y')),
          h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('factor') }), num('factor', 'k', '5em')));
        break;
    }

    const rubric = this.result
      ? h('div', { class: this.result.equivalent ? 'success' : 'fail' },
          h('strong', {}, this.result.equivalent ? t('success') : t('wrong_try')),
          this.result.equivalent && !this.result.typeOk ? h('p', {}, t('equivalent_note')) : null,
          h('div', { class: 'rubric' },
            h('span', {}, `${t('rubric')}: ${this.result.parts.filter((p) => p.ok).length}/${this.result.typeOk ? this.result.parts.length : '?'}`),
            h('ul', {}, ...this.result.parts.map((p) => h('li', { class: p.ok ? 'ok' : 'no', html: `${p.ok ? '✓' : '✗'} ${term(p.key)}` })))),
          this.result.equivalent ? h('div', { class: 'desc-main', html: describe(this.preview, lang) }) : null)
      : null;

    fill(panel, 
      h('h2', {}, `${t('mode_detective')} · ${t('level')} ${ctx.level}`),
      h('p', { class: 'task' }, t('detective_task')),
      h('form', { class: 'det-form', onsubmit: (e) => { e.preventDefault(); this.check(); } },
        h('div', { class: 'fields' }, h('span', { class: 'fld-l', html: term('type') }),
          sel('type', [['', t('choose')], ...TYPES.map((ty) => [ty, `${ctx.word(ty)}`])], () => { this.result = null; ctx.rerender(); })),
        ...fields,
        this.error ? h('p', { class: 'warn' }, this.error) : null,
        f.type ? h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn ghost', onclick: () => this.test() }, t('try_it')),
          h('button', { type: 'submit', class: 'btn primary' }, t('check'))) : null),
      rubric,
      this.reveal ? h('div', { class: 'key' }, h('b', {}, t('answer_key') + ': '), h('span', { html: describe(this.p.transforms[0], lang) })) : null,
      h('div', { class: 'row' },
        !this.reveal && !this.result?.equivalent ? h('button', { class: 'btn ghost', onclick: () => { this.reveal = true; ctx.rerender(); } }, t('show_answer')) : null,
        h('button', { class: 'btn primary', onclick: () => this.newProblem() }, t('next'))),
    );
  },
};
