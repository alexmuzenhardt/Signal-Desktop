// Copyright 2022 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only
/* eslint-disable no-await-in-loop, no-console */

import assert from 'assert';
import type { PrimaryDevice } from '@signalapp/mock-server';

import type { App } from './fixtures';
import { Bootstrap, debug, stats, RUN_COUNT, DISCARD_COUNT } from './fixtures';

const CONVERSATION_SIZE = 1000; // messages
const DELAY = 50; // milliseconds

void (async () => {
  const bootstrap = new Bootstrap({
    benchmark: true,
  });

  await bootstrap.init();

  let app: App | undefined;
  try {
    app = await bootstrap.link();
    const { server, contacts, phone, desktop } = bootstrap;

    const [first, second] = contacts;

    const messages = new Array<Buffer>();
    debug('encrypting');
    // Send messages from just two contacts
    for (const contact of [second, first]) {
      for (let i = 0; i < CONVERSATION_SIZE; i += 1) {
        const messageTimestamp = bootstrap.getTimestamp();
        messages.push(
          await contact.encryptText(
            desktop,
            `hello from: ${contact.profileName}`,
            {
              timestamp: messageTimestamp,
              sealed: true,
            }
          )
        );

        messages.push(
          await phone.encryptSyncRead(desktop, {
            timestamp: bootstrap.getTimestamp(),
            messages: [
              {
                senderUUID: contact.device.uuid,
                timestamp: messageTimestamp,
              },
            ],
          })
        );
      }
    }

    const sendQueue = async (): Promise<void> => {
      await Promise.all(messages.map(message => server.send(desktop, message)));
    };

    const measure = async (): Promise<void> => {
      assert(app);
      const window = await app.getWindow();

      const leftPane = window.locator('.left-pane-wrapper');

      const openConvo = async (contact: PrimaryDevice): Promise<void> => {
        debug('opening conversation', contact.profileName);
        const item = leftPane.locator(
          `[data-testid="${contact.toContact().uuid}"]`
        );

        await item.click();
      };

      const deltaList = new Array<number>();
      for (let runId = 0; runId < RUN_COUNT + DISCARD_COUNT; runId += 1) {
        await openConvo(runId % 2 === 0 ? first : second);

        debug('waiting for timing from the app');
        const { delta } = await app.waitForConversationOpen();

        // Let render complete
        await new Promise(resolve => setTimeout(resolve, DELAY));

        if (runId >= DISCARD_COUNT) {
          deltaList.push(delta);
          console.log('run=%d info=%j', runId - DISCARD_COUNT, { delta });
        } else {
          console.log('discarded=%d info=%j', runId, { delta });
        }
      }

      console.log('stats info=%j', { delta: stats(deltaList, [99, 99.8]) });
    };

    await Promise.all([sendQueue(), measure()]);
  } catch (error) {
    await bootstrap.saveLogs(app);
    throw error;
  } finally {
    await app?.close();
    await bootstrap.teardown();
  }
})();
