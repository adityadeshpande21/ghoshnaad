// Which install steps fit this device and browser, and whether the app is already installed or is the downloaded file.
// Pure: it reads a description of the environment, so every device can be tested without one.

export interface InstallEnv {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  /** running as an installed app (display-mode: standalone, or iOS navigator.standalone) */
  standalone: boolean;
  protocol: string;
  /** the browser offered its own install prompt (beforeinstallprompt) */
  canPrompt?: boolean;
}

export type Where = 'installed' | 'file' | 'website';
export type Os = 'ios' | 'android' | 'desktop';
export type Browser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

export interface InstallAdvice {
  where: Where;
  os: Os;
  browser: Browser;
  /** key of the text in src/i18n for the steps; null when nothing needs to be done */
  steps: string | null;
  canPrompt: boolean;
}

export function detectInstall(env: InstallEnv): InstallAdvice {
  const ua = env.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (env.platform === 'MacIntel' && (env.maxTouchPoints ?? 0) > 1);
  const android = /Android/.test(ua);
  const os: Os = ios ? 'ios' : android ? 'android' : 'desktop';
  // order matters: Edge, Samsung and Chrome on iOS all also say "Chrome" or "Safari"
  const browser: Browser = /SamsungBrowser/.test(ua) ? 'samsung'
    : /EdgA?\/|EdgiOS\//.test(ua) ? 'edge'
    : /Firefox\/|FxiOS\//.test(ua) ? 'firefox'
    : /CriOS\/|Chrome\//.test(ua) ? 'chrome'
    : /Safari\//.test(ua) ? 'safari' : 'other';

  const where: Where = env.protocol === 'file:' ? 'file' : env.standalone ? 'installed' : 'website';
  const advice = (steps: string | null): InstallAdvice => ({ where, os, browser, steps, canPrompt: !!env.canPrompt && where === 'website' });
  if (where === 'installed') return advice(null);
  if (where === 'file') return advice('file');

  if (os === 'ios') return advice(browser === 'safari' ? 'ios-safari' : 'ios-other');
  if (os === 'android') return advice(browser === 'samsung' ? 'android-samsung' : browser === 'firefox' ? 'android-firefox' : 'android-chrome');
  if (browser === 'chrome' || browser === 'edge') return advice('desktop-chromium');
  if (browser === 'safari') return advice('desktop-safari');
  return advice('desktop-other');
}

export function currentEnv(extra: { canPrompt?: boolean } = {}): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || nav.standalone === true;
  return { userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, standalone, protocol: location.protocol, canPrompt: extra.canPrompt };
}
