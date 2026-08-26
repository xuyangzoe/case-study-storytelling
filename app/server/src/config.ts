import path from 'node:path';

const rootDir = process.cwd();

export const CONFIG = {
  port: Number(process.env.PORT ?? 4000),
  /** JSON database location. Override with DATA_FILE to run several instances. */
  dataFile: process.env.DATA_FILE ?? path.join(rootDir, 'data', 'multicat.json'),
  /** Where the built web client lives; served in production so one process runs the app. */
  webDist: process.env.WEB_DIST ?? path.join(rootDir, '..', 'web', 'dist'),
} as const;
