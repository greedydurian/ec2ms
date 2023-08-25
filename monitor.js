import { EventEmitter } from 'events';
import fs from 'fs';
import { Client } from 'ssh2';

export const monitor = new EventEmitter();
const logFilePath = 'connection-attempts.log';

export function logToFile(eventType, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${eventType}] ${timestamp} - ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

