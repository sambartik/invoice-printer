import winston from 'winston';
import 'winston-daily-rotate-file';
import {LogtailTransport} from '@logtail/winston';
import {Logtail} from '@logtail/node';

import path from 'path';

const {combine, timestamp, printf, colorize, align, json} = winston.format;

const logtail = new Logtail(process.env.LOGTAIL_TOKEN || '');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp({
      format: 'YYYY-DD-MM HH:mm:ss.SSS',
    }),
    json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.resolve(
        __dirname,
        '../',
        process.env.LOG_DIR || 'log',
        'error-warn.%DATE%.log'
      ),
      level: 'warn',
      datePattern: 'YYYY-DD-MM',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({
      filename: path.resolve(__dirname, '../', process.env.LOG_DIR || 'log', 'combined.%DATE%.log'),
      datePattern: 'YYYY-DD-MM',
      maxFiles: '14d',
    }),
    new winston.transports.Console({
      format: combine(
        colorize({all: true}),
        timestamp({
          format: 'YYYY-DD-MM HH:mm:ss.SSS',
        }),
        align(),
        printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`)
      ),
      level: 'verbose',
    }),
    new LogtailTransport(logtail),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.resolve(__dirname, '../', process.env.LOG_DIR || 'log', 'exception.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.resolve(__dirname, '../', process.env.LOG_DIR || 'log', 'rejection.log'),
    }),
  ],
});

export default logger;
