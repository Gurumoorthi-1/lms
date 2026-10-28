// Run with: node --test test/youtube-apify.test.js
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { AiService } from '../src/ai/ai.service.js';

process.env.OPENAI_API_KEY ??= 'test-key'; // constructor needs a value; no OpenAI calls are made

const RUN = { data: { data: { id: 'run1', status: 'READY', defaultDatasetId: 'ds1' } } };

function mockApify(datasetItems) {
  const posts = [];
  mock.method(axios, 'post', async (url, body) => { posts.push({ url, body }); return RUN; });
  mock.method(axios, 'get', async (url) => {
    if (url.includes('/actor-runs/')) return { data: { data: { status: 'SUCCEEDED' } } };
    if (url.includes('/datasets/')) return { data: datasetItems };
    return { data: '<title>Fallback - YouTube</title>' };
  });
  return posts;
}

afterEach(() => { mock.restoreAll(); delete process.env.APIFY_API_TOKEN; });

test('uses the Apify transcript Actor and returns its text', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  process.env.APIFY_API_TOKEN = 'test-token';
  const posts = mockApify([{ status: 'OK', title: 'Me at the zoo', text: 'All right, so here we are' }]);
  const fallback = mock.method(YoutubeTranscript, 'fetchTranscript', async () => { throw new Error('should not run'); });

  const p = new AiService().getYoutubeContent('jNQXAC9IVRw');
  for (let i = 0; i < 5; i++) { await new Promise(setImmediate); t.mock.timers.tick(3000); }
  const { transcript, title } = await p;

  assert.match(posts[0].url, /acts\/shephouse~youtube-transcript-scraper-bulk\/runs/);
  assert.deepEqual(posts[0].body, { startUrls: [{ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }], maxTranscripts: 1 });
  assert.equal(title, 'Me at the zoo');
  assert.equal(transcript, 'All right, so here we are');
  assert.equal(fallback.mock.callCount(), 0);
});

test('falls back to youtube-transcript when the video has no captions', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  process.env.APIFY_API_TOKEN = 'test-token';
  mockApify([{ status: 'FAILED', errorCode: 'NO_CAPTIONS', errorMessage: 'This video has no captions' }]);
  mock.method(YoutubeTranscript, 'fetchTranscript', async () => [{ text: 'from' }, { text: 'fallback' }]);

  const p = new AiService().getYoutubeContent('aqz-KE-bpKQ');
  for (let i = 0; i < 5; i++) { await new Promise(setImmediate); t.mock.timers.tick(3000); }
  const { transcript } = await p;
  assert.equal(transcript, 'from fallback');
});

test('skips Apify entirely when APIFY_API_TOKEN is not set', async () => {
  const post = mock.method(axios, 'post', async () => RUN);
  mock.method(axios, 'get', async () => ({ data: '' }));
  mock.method(YoutubeTranscript, 'fetchTranscript', async () => [{ text: 'npm path' }]);
  const { transcript } = await new AiService().getYoutubeContent('jNQXAC9IVRw');
  assert.equal(post.mock.callCount(), 0);
  assert.equal(transcript, 'npm path');
});
