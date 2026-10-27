// Browser entry for the composer model: the composer, library and platform screens call window.Composer.
import * as Composer from '../core/composer.ts';

(window as unknown as { Composer: typeof Composer }).Composer = Composer;
