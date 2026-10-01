import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * Regression guard: the cache sweep interval must not pin the Node event loop.
 *
 * This used to hold the loop open forever, so any script or test process that
 * merely touched the cache hung instead of exiting. Caught by spawning a child
 * that warms the cache manager and must come back on its own.
 */
test('cache manager does not keep the event loop alive', () => {
    const entry = path.join(__dirname, '..', 'lib', 'ai', 'cache', 'cache-manager.js');
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `require(${JSON.stringify(entry)}).getCacheManager(); process.stdout.write('warmed');`,
        ],
        { encoding: 'utf8', timeout: 10_000 }
    );

    assert.equal(result.error, undefined, 'child process failed to spawn');
    assert.ok(
        result.stdout.trimEnd().endsWith('warmed'),
        `child did not reach the warm-up call (stdout=${JSON.stringify(result.stdout)})`
    );
    // status === null means the timeout killed it: the loop was still held open.
    assert.equal(
        result.status,
        0,
        `child never exited on its own (status=${result.status}, signal=${result.signal}) — an active handle is leaking`
    );
});
