// Mode Komposisi: dua transformasi berurutan. Langkah 1 dikunci, lalu bayangannya jadi objek langkah 2.
import { h, fill } from '../core/dom.js';
import { makeProblem } from '../geometry/generator.js';
import { apply, equalOrdered } from '../geometry/transforms.js';
import { describe } from '../geometry/describe.js';
import { labels } from '../geometry/shapes.js';

export const composition = {
  id: 'composition',
  usesManipulator: true,

  mount(ctx) {
    this.ctx = ctx;
    this.newProblem();
  },

  newProblem() {
    const { ctx } = this;
    this.p = makeProblem({ level: ctx.level, steps: 2 });
    this.done = [];
    this.solved = false;
    this.reveal = false;
    this.applyStep();
  },

  applyStep() {
    const { ctx } = this;
    const step = this.done.length;
    const obj = step === 0 ? this.p.shape : apply(this.done[0], this.p.shape);
    ctx.setObject(obj, step);
    const n = this.p.shape.length;
    const extras = [{ pts: this.p.image, kind: 'target', labels: labels(n, 2) }];
    if (step === 1) extras.unshift({ pts: this.p.shape, kind: 'ghost', labels: labels(n) });
    ctx.setExtras(extras);
    ctx.manip.enabled = true;
    ctx.manip.reset();
  },

  lock() {
    if (!this.ctx.manip.touched) return;
    this.done.push(structuredClone(this.ctx.manip.t));
    this.applyStep();
  },

  undo() {
    this.done = [];
    this.applyStep();
  },

  onChange() {
    const { ctx } = this;
    if (this.solved || this.done.length !== 1 || !ctx.manip.touched) return;
    const img = apply(ctx.manip.t, ctx.object);
    if (equalOrdered(img, this.p.image)) {
      this.solved = true;
      this.done.push(structuredClone(ctx.manip.t));
      ctx.manip.enabled = false;
      ctx.score(true);
      ctx.celebrate();
    }
  },

  render(panel) {
    const { ctx } = this;
    const { t, lang, manip } = ctx;
    const step = Math.min(this.done.length + 1, 2);
    const list = (ts) => h('ol', { class: 'steps' }, ...ts.map((tr) => h('li', { html: describe(tr, lang) })));
    fill(panel, 
      h('h2', {}, `${t('mode_composition')} · ${t('level')} ${ctx.level}`),
      h('p', { class: 'task' }, t('composition_task')),
      h('div', { class: 'stepper' },
        h('span', { class: step === 1 && !this.solved ? 'on' : 'off' }, `${t('step')} 1`),
        h('span', { class: step === 2 && !this.solved ? 'on' : 'off' }, `${t('step')} 2`)),
      this.done.length ? list(this.done) : null,
      !this.solved && manip.touched ? h('div', { class: 'desc' }, h('div', { class: 'desc-main', html: describe(manip.t, lang) })) : null,
      this.solved ? h('div', { class: 'success' }, h('strong', {}, t('success'))) : null,
      this.reveal ? h('div', { class: 'key' }, h('b', {}, t('answer_key') + ':'), list(this.p.transforms)) : null,
      h('div', { class: 'row' },
        !this.solved && this.done.length === 0 ? h('button', { class: 'btn', disabled: !manip.touched, onclick: () => this.lock() }, t('lock_step')) : null,
        !this.solved && this.done.length === 1 ? h('button', { class: 'btn', onclick: () => this.undo() }, t('undo_step')) : null,
        !this.solved && !this.reveal ? h('button', { class: 'btn ghost', onclick: () => { this.reveal = true; ctx.score(false); ctx.rerender(); } }, t('show_answer')) : null,
        h('button', { class: 'btn primary', onclick: () => this.newProblem() }, t('next'))),
    );
  },
};
