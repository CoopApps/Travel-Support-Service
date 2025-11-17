/**
 * Message Scheduler Service
 *
 * Handles scheduled message processing for SMS and Email delivery
 * Runs as a cron job to check and send scheduled messages
 */

import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { processScheduledSms } from './smsService';

/**
 * Initialize scheduled message processor
 * Runs every minute to check for messages that need to be sent
 */
export function initializeMessageScheduler() {
  logger.info('Initializing message scheduler service');

  // Run every minute: "* * * * *"
  // For production, you might want to adjust the frequency
  const task = cron.schedule('* * * * *', async () => {
    try {
      logger.debug('Running scheduled message processor');
      await processScheduledSms();
    } catch (error) {
      logger.error('Error in scheduled message processor', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start the task
  task.start();

  logger.info('Message scheduler initialized - checking every minute for scheduled messages');

  return task;
}

/**
 * Stop the message scheduler
 */
export function stopMessageScheduler(task: cron.ScheduledTask) {
  logger.info('Stopping message scheduler');
  task.stop();
}
