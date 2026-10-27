// Browser entry for data and platform: the settings sheet and the bottom bar reach them as window.GhoshPlatform.
import { LocalKv } from '../data/kv.ts';
import { Settings } from '../data/settings.ts';
import { UserLibrary } from '../data/userLibrary.ts';
import { createBackup, parseBackup, planRestore, applyRestore, planIsEmpty, backupFileName, olderCopiesFile } from '../data/backup.ts';
import { StorageGuard } from '../platform/storageGuard.ts';
import { detectInstall, currentEnv } from '../platform/installGuide.ts';
import { UpdateManager } from '../platform/updateManager.ts';

const GhoshPlatform = {
  LocalKv, Settings, UserLibrary, StorageGuard, UpdateManager,
  createBackup, parseBackup, planRestore, applyRestore, planIsEmpty, backupFileName, olderCopiesFile,
  detectInstall, currentEnv,
};
(window as unknown as { GhoshPlatform: typeof GhoshPlatform }).GhoshPlatform = GhoshPlatform;
