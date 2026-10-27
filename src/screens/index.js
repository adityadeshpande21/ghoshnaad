// @ts-check
// The screens that have been migrated to the Screen / App structure. The page starts them with its services: Screens.start(AppEnv).
import { App } from '../ui/screen.js';
import { GuideScreen } from './guide/guide.js';
import { createPlayer } from './player/player.loose.js';
import { createList } from './list/list.loose.js';
import { ComposerScreen } from './composer/composer.loose.js';
import { createLibrary } from './library/library.loose.js';
import { CorrectionScreen } from './correction/correction.loose.js';
import { TalaTimelineScreen } from './tala/tala.js';
import { ExportScreen } from './export/export.loose.js';
import { SoundCheckScreen } from './soundcheck/soundcheck.loose.js';
import { GhoshdandScreen } from './ghoshdand/ghoshdand.loose.js';
import { Figure } from './ghoshdand/figure.loose.js';

/** @param {import('../ui/env.d.ts').AppEnv} env */
export function start(env) {
  const app = new App(env);
  // the player first: it provides the sound, player and settings services that the other screens use
  const player = createPlayer(env);
  Object.assign(env, player.services);
  app.register('player', player);
  const guide = app.register('guide', new GuideScreen(env));
  const ghoshdand = app.register('ghoshdand', new GhoshdandScreen(env));
  app.register('list', createList(env));
  const composer = app.register('composer', new ComposerScreen(env));
  const library = createLibrary(env);
  app.register('library', { onLang: () => library.renderBar() });
  const correction = app.register('correction', new CorrectionScreen(env));
  app.register('tala', new TalaTimelineScreen(env));
  const exporter = app.register('export', new ExportScreen(env));
  const soundcheck = app.register('soundcheck', new SoundCheckScreen(env));
  // names the pages that are not migrated yet still use
  Object.assign(window, { ScreenApp: app, Sanket: Figure, SanketUI: { open: (/** @type {any} */ a) => ghoshdand.open(a), close: () => ghoshdand.close(), stopAll: () => ghoshdand.onStopAll(), _E: ghoshdand.page._E, _cycle: ghoshdand.page._cycle }, ComposerUI: composer.ui, Library: library, FixerUI: { open: (/** @type {any} */ a) => correction.open(a), back: () => correction.fx.back(), editing: () => correction.fx.editing(), lang: () => correction.onLang() }, Swarlipi: { open: (/** @type {any} */ p) => exporter.open(p), text: exporter.x.text, sheet: exporter.x.sheet }, SoundLab: { open: (/** @type {number | null} */ t) => soundcheck.open(t), close: () => soundcheck.close(), stopAll: () => soundcheck.onStopAll() }, Guide: { open: (/** @type {string | null} */ s) => guide.open(s), close: () => guide.close(), sample: (/** @type {string} */ src) => guide.sample(src) } });
  return app;
}
