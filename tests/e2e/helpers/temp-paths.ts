import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "../../../src/db.ts";

export interface TempPaths {
  dir: string;
  configPath: string;
  dbPath: string;
  writeConfig: (config: Record<string, unknown>) => void;
  /** Create the full CheckApp DB schema at dbPath. Call before booting the
   *  dashboard so report pages and /api routes don't 500 on missing tables. */
  initDbSchema: () => void;
  cleanup: () => void;
}

export function allocateTempPaths(): TempPaths {
  const dir = mkdtempSync(join(tmpdir(), "checkapp-e2e-"));
  const configPath = join(dir, "config.json");
  const dbPath = join(dir, "checkapp.db");
  return {
    dir,
    configPath,
    dbPath,
    writeConfig(config) {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    },
    initDbSchema() {
      const db = openDb(dbPath);
      db.close();
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
