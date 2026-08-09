#!/usr/bin/env node

import "./app/shutdown.js";
import { appConfig } from "./app/config.js";
import { spinner } from "./app/spinner.js";
import { MODES, FLAGS } from "./app/constants.js";
import { showHelp } from "./app/help.js";
import { logger } from "./shared/logger.js";

import { scan } from "./features/scan/scan.js";

import { runPipeline } from "./pipeline/index.js";

const args = process.argv.slice(2);

const config = {
  mode: null,
  path: null,
  recursive: false,
  auto: false,
  help: false,
};

config.mode = MODES[args[0]];
config.help = args.some((arg) => arg === "-h" || arg === "--help");

if (config.help) {
  showHelp(config.mode);
  process.exit(0);
}

for (let i = 1; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith("-")) {
    const flag = FLAGS[arg];

    if (!flag) {
      logger.error(`'${arg}' is not a valid flag`);
      process.exit(1);
    }

    config[flag] = true;
  } else if (!config.path) {
    config.path = arg;
  } else {
    logger.error(`Unexpected argument: '${arg}'`);
    process.exit(1);
  }
}

if (!config.mode) {
  logger.error(`A valid mode is required`);
  process.exit(1);
}

if (!config.path) {
  logger.error("Path is required.");
  process.exit(1);
}

logger.divider();
logger.title(appConfig.appName);
logger.text(`Mode             : ${config.mode}`);
logger.text(`Path             : ${config.path}`);
logger.text(`Recursive        : ${config.recursive}`);
logger.text(`Auto-Selection   : ${config.auto}`);
logger.divider();

let files;

spinner.start("");

try {
  spinner.step("Scanning Files");

  files = await scan(config.path, config.recursive);

  logger.success(`Found ${files.length} media files`);
} catch (err) {
  spinner.fail("Failed to scan library");
  logger.error(err.message);
  process.exit(1);
}

logger.divider();

await runPipeline(files, config);

logger.divider();
spinner.success("Completed");
logger.info("Keep sorted with 'First Modified' for sort in release order");
