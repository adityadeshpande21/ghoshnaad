// Browser entry for the timeline: the player, composer, sound check and Ghoshdand pages call buildTimeline3 as a global.
import { buildTimeline3 } from '../core/index.ts';

(window as unknown as { buildTimeline3: unknown }).buildTimeline3 = buildTimeline3;
