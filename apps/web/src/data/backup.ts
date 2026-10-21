import { exportReminder } from '@knightschool/core';
import type { BrowserStorage, Storage } from '@knightschool/storage';

/** The settings key holding when the data was last exported, for the reminder to export. */
const LAST_EXPORT_KEY = 'lastExportAt';

/** Saves `data` as a file in the browser's downloads. */
export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

async function exported(browser: BrowserStorage) {
  const now = new Date().toISOString();
  await browser.storage.settings.set(LAST_EXPORT_KEY, now, now);
}

/** Downloads every table as readable JSON, and notes the time for the reminder. */
export async function exportJsonFile(browser: BrowserStorage) {
  download(`knightschool-${today()}.json`, JSON.stringify(await browser.exportJson(), null, 2), 'application/json');
  await exported(browser);
}

/** Downloads the SQLite database file, and notes the time for the reminder. */
export async function exportSqliteFile(browser: BrowserStorage) {
  download(`knightschool-${today()}.sqlite`, await browser.exportSqlite(), 'application/vnd.sqlite3');
  await exported(browser);
}

/**
 * Whether to remind the learner to export, now that the database holds authored work: counted from the last export,
 * or from the first authored change when there has been none (`exportReminder` in core).
 */
export async function reminderToExport(storage: Storage, now = new Date()) {
  const last = await storage.settings.get(LAST_EXPORT_KEY);
  if (last) return exportReminder(await storage.authoring.changesSince(last), last, now);
  const history = await storage.authoring.history();
  return exportReminder(history.length, history.at(-1)?.at, now);
}
