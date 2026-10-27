// Browser entry for audio: the player and the sound pages reach the engine as window.GhoshAudio.
import * as GhoshAudio from '../audio/index.ts';

(window as unknown as { GhoshAudio: typeof GhoshAudio }).GhoshAudio = GhoshAudio;
