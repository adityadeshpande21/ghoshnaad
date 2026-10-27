// Every key v1.1.0 wrote, and what kind of thing it holds. This is the one place that says what is the person's work,
// what is a preference and what is only bookkeeping for this device.

/** The person's work. Travels in a backup. */
export const WORK_KEYS = ['mine', 'fix'] as const;
/** Preferences. Travel in a backup, but never replace a choice already made on the device that restores. */
export const SETTING_KEYS = [
  'lang', 'theme', 'sec', 'insF', 'saKeys', 'artic', 'kanMs', 'inst', 'sel2', 'recent', 'lib', 'xstyle', 'xlay', 'xsel2', 'skView', 'guideOff',
] as const;
/** About this device or this copy of the app only (folder bookkeeping, "playing" across tabs, backup reminders). Never in a backup. */
export const DEVICE_KEYS = ['filed', 'mineDel', 'playing', 'backup', 'seenVersion', 'installSeen', 'firstRunSeen', 'fixOld'] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const isSettingKey = (k: string): k is SettingKey => (SETTING_KEYS as readonly string[]).includes(k);

/** The page that the second page of this app, the tala timeline, stores its choices under (outside the "ghosh." prefix). */
export const TALA_PAGE_KEY = 'tala.v3';

export const BACKUP_FORMAT = 'ghoshnaad-backup/1';
export const BACKUP_MAX_BYTES = 50 * 1024 * 1024;
