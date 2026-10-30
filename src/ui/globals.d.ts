// The globals the page scripts that are not modules (src/app/app.js, src/app/platform.js) get from the bundles and from each other.
// Declared here, and only here, so the typecheck still fails on any other name that does not exist.
declare var GhoshCatalog: any;     // src/data/catalog.ts (bundle: composercore / screens)
declare var I18n: any;             // src/ui/i18n.loose.js (bundle: i18n)
declare var GhoshCompile: any;     // src/core (bundle: compiler)
declare var Composer: any;         // src/core/composer.ts (bundle: composercore)
declare var ScreenApp: any;        // the App of src/screens/index.js, set by Screens.start
declare var ComposerUI: any;       // the composer screen's handle (window compat, still used by app.js / platform.js / tests)
declare var Library: any;          // the folder library's handle (same)
declare var renderSheet: any;      // the player's settings sheet redraw (same)
declare var AppEnv: any;           // the services object app.js builds for the screens

// Handles the page scripts and the screens put on `window` (still read by name by app.js, platform.js and a few screens, and by the tests)
interface Window {
  APP: any;
  GHOSH_PACK: string;
  fflate: any;
  GhoshPlatform: any;
  PlatformUI: any;
  FixerUI: any;
  Swarlipi: any;
  LIBROWS: any[];
  /** the folder library: the file pickers of the File System Access API (Chrome / Edge) */
  showDirectoryPicker?: (o?: object) => Promise<any>;
  showSaveFilePicker?: (o?: object) => Promise<any>;
  /** a hook the engine page calls on every painted frame of the sound check */
  onEnginePaint?: (t: number) => void;
}
