// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { WebAPIType } from '../textsecure/WebAPI';
import { drop } from '../util/drop';

import { conversationJobQueue } from './conversationJobQueue';
import { deliveryReceiptsJobQueue } from './deliveryReceiptsJobQueue';
import { readReceiptsJobQueue } from './readReceiptsJobQueue';
import { readSyncJobQueue } from './readSyncJobQueue';
import { removeStorageKeyJobQueue } from './removeStorageKeyJobQueue';
import { reportSpamJobQueue } from './reportSpamJobQueue';
import { singleProtoJobQueue } from './singleProtoJobQueue';
import { viewOnceOpenJobQueue } from './viewOnceOpenJobQueue';
import { viewSyncJobQueue } from './viewSyncJobQueue';
import { viewedReceiptsJobQueue } from './viewedReceiptsJobQueue';

/**
 * Start all of the job queues. Should be called when the database is ready.
 */
export function initializeAllJobQueues({
  server,
}: {
  server: WebAPIType;
}): void {
  reportSpamJobQueue.initialize({ server });

  // General conversation send queue
  drop(conversationJobQueue.streamJobs());

  // Single proto send queue, used for a variety of one-off simple messages
  drop(singleProtoJobQueue.streamJobs());

  // Syncs to others
  drop(deliveryReceiptsJobQueue.streamJobs());
  drop(readReceiptsJobQueue.streamJobs());
  drop(viewedReceiptsJobQueue.streamJobs());

  // Syncs to ourselves
  drop(readSyncJobQueue.streamJobs());
  drop(viewSyncJobQueue.streamJobs());
  drop(viewOnceOpenJobQueue.streamJobs());

  // Other queues
  drop(removeStorageKeyJobQueue.streamJobs());
  drop(reportSpamJobQueue.streamJobs());
}
