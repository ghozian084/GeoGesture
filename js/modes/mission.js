// Mode Misi: cocokkan bayangan target dengan SATU transformasi.
import { h, fill } from '../core/dom.js';
import { makeProblem } from '../geometry/generator.js';
import { apply, equalOrdered, equalAsSet } from '../geometry/transforms.js';
import { describe } from '../geometry/describe.js';
import { labels } from '../geometry/shapes.js';

export const mission = {
  id: 'mission',
  usesManipulator: true,

  mount(ctx) {
    this.ctx = ctx;
    this.newProblem();
  },

  newProblem() {
    const { ctx } = this;
    this.p = makeProblem({ level: ctx.level, steps: 1 });
    this.solved = false;
    this.reveal = false;
    ctx.setObject(this.p.shape);
    ctx.setExtras([{ pts: this.p.image, kind: 'target', labels: labels(this.p.shape.length, 1) }]);
    ctx.manip.enabled = true;
    ctx.manip.reset();
  },

  onChange() {
    const { ctx } = this;
    if (this.solved || !ctx.manip.touched) return;
    const img = apply(ctx.manip.t, ctx.object);
    if (equalOrdered(img, this.p.image)) {
      this.solved = true;
      this.solvedWith = structuredClone(ctx.manip.t);
      ctx.manip.enabled = false;
      ctx.score(true);
      ctx.celebrate();
    }
  },

  render(panel) {
    const { ctx } = this;
    const { t, lang, manip } = ctx;
    const img = manip.touched ? apply(manip.t, ctx.object) : null;
    const almost = !this.solved && img && equalAsSet(img, this.p.image);
    fill(panel, 
      h('h2', {}, `${t('mode_mission')} · ${t('level')} ${ctx.level}`),
      h('p', { class: 'task' }, t('mission_task')),
      this.solved
        ? h('div', { class: 'success' },
            h('strong', {}, t('success')),
            h('div', { class: 'desc-main', html: describe(this.solvedWith, lang) }),
            h('div', { class: 'desc-alt', html: describe(this.solvedWith, ctx.other) }))
        : manip.touched
          ? h('div', { class: 'desc' }, h('div', { class: 'desc-main', html: describe(manip.t, lang) }))
          : null,
      almost ? h('p', { class: 'warn' }, t('close_hint')) : null,
      this.reveal ? h('div', { class: 'key' }, h('b', {}, t('answer_key') + ': '), h('span', { html: describe(this.p.transforms[0], lang) })) : null,
      h('div', { class: 'row' },
        !this.solved && !this.reveal ? h('button', { class: 'btn ghost', onclick: () => { this.reveal = true; ctx.score(false); ctx.rerender(); } }, t('show_answer')) : null,
        h('button', { class: 'btn primary', onclick: () => this.newProblem() }, t('next'))),
    );
  },
};
