import { MODULE_ID } from '../constants';

/**
 * Logging
 * @module Logging
 */

export enum LogLevel {
  ERROR,
  INFO,
  WARN,
  DEBUG,
  ALL,
}

/**
 * Simple wrapper around console.log to give us log level functionality.
 * @function
 * @param {LogLevel} messageLevel - ERROR,INFO,DEBUG,WARN,ALL
 * @param {...any} args - console.log() arguments
 */
export function log(messageLevel: LogLevel, ...args: any): void {
  if (messageLevel > CONFIG[MODULE_ID]['logLevel']) return;
  if (messageLevel === LogLevel.ERROR) console.error(MODULE_ID + ' | ', ...args);
  else if (messageLevel === LogLevel.WARN) console.warn(MODULE_ID + ' | ', ...args);
  else console.log(MODULE_ID + ' | ', ...args);
}
