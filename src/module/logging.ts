import { MODULE_ID } from '../constants';

export enum LogLevel {
  ERROR,
  INFO,
  DEBUG,
  WARN,
  ALL,
}

export function log(messageLevel: LogLevel, ...args): void {
  if (messageLevel > CONFIG.logLevel) return;
  console.log(MODULE_ID + ' | ', ...args);
}
