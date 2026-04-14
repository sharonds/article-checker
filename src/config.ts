import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

const CONFIG_DIR = join(homedir(), ".article-checker");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  copyscapeUser: string;
  copyscapeKey: string;
  parallelApiKey?: string;
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function readConfig(): Config {
  const file: Partial<Config> = existsSync(CONFIG_FILE)
    ? (JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as Config)
    : {};

  // Environment variables take precedence over the config file.
  // This allows CI / Docker / .env usage without running --setup.
  return {
    copyscapeUser: process.env.COPYSCAPE_USER ?? file.copyscapeUser ?? "",
    copyscapeKey: process.env.COPYSCAPE_KEY ?? file.copyscapeKey ?? "",
    parallelApiKey: process.env.PARALLEL_API_KEY ?? file.parallelApiKey,
  };
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function configPath(): string {
  return CONFIG_FILE;
}
