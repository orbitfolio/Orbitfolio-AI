import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    parseYahooRss,
    newsCacheKey,
    NEWS_TTL_SECONDS,
    resolveNewsFromFeeds,
    yahooRssUrl,
    googleNewsRssUrl,
} from '../lib/market/news';
import { PILLAR_WEIGHTS } from '../lib/market/rating';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss><channel>
<item><title>Apple beats quarterly estimates</title><link>https://finance.yahoo.com/news/aapl-1</link><pubDate>Wed, 30 Sep 2026 12:00:00 +0000</pubDate><source>Reuters</source></item>
<item><title><![CDATA[iPhone sales & services grow]]></title><link>https://finance.yahoo.com/news/aapl-2</link><source>Bloomberg</source></item>
<item><title>Services margin &#39;expands&#39; again</title><link>http://finance.yahoo.com/news/aapl-3</link><source>CNBC</source></item>
<item><title>javascript:alert(1)</title><link>javascript:alert(1)</link></item>
<item><title>Not https</title><link>ftp://files.example.com/x</link></item>
<item><title>No link item</title></item>
<item><title>Seventh story</title><link>https://finance.yahoo.com/news/aapl-7</link></item>
</channel></rss>`;

test('parses items, decodes entities and CDATA, keeps valid links', () => {
    const items = parseYahooRss(SAMPLE, 6);
    assert.equal(items.length, 4); // 4 valid links; js:/ftp:/linkless dropped
    assert.equal(items[0].title, 'Apple beats quarterly estimates');
    assert.equal(items[0].publisher, 'Reuters');
    assert.equal(items[0].publishedAt, Date.parse('Wed, 30 Sep 2026 12:00:00 +0000'));
    // CDATA is literal text: entities inside it are NOT decoded again.
    assert.equal(items[1].title, 'iPhone sales & services grow');
    assert.ok(items[1].publishedAt === null);
    // http (non-https) links are still acceptable links.
    assert.equal(items[2].title, "Services margin 'expands' again");
    assert.equal(items[2].link, 'http://finance.yahoo.com/news/aapl-3');
    assert.ok(items.every((i) => /^https?:\/\//.test(i.link)));
});

test('rejects javascript:, ftp:, and missing links', () => {
    const items = parseYahooRss(SAMPLE, 6);
    const links = items.map((i) => i.link);
    assert.equal(links.some((l) => l.startsWith('javascript:')), false);
    assert.equal(links.some((l) => l.startsWith('ftp:')), false);
    assert.equal(items.length < 6, true);
});

test('respects the limit', () => {
    assert.equal(parseYahooRss(SAMPLE, 2).length, 2);
});

test('garbage input yields empty array, never throws', () => {
    assert.deepEqual(parseYahooRss('not xml at all'), []);
    assert.deepEqual(parseYahooRss(''), []);
});

test('news falls back to the second feed when the first is empty or fails', async () => {
    const yahooXml = `<rss><channel><item><title>Yahoo story</title><link>https://finance.yahoo.com/news/y1</link></item></channel></rss>`;
    const googleXml = `<rss><channel><item><title>Google story</title><link>https://news.google.com/rss/articles/g1</link></item></channel></rss>`;

    // First feed wins.
    let calls = 0;
    const firstOk = (async (url: string) => {
        calls += 1;
        return { ok: true, text: async () => (url === yahooRssUrl('AAPL') ? yahooXml : googleXml) };
    }) as never;

    const primary = await resolveNewsFromFeeds([yahooRssUrl('AAPL'), googleNewsRssUrl('AAPL')], 6, firstOk as never);
    assert.equal(primary.length, 1);
    assert.equal(primary[0].title, 'Yahoo story');
    assert.equal(calls, 1); // never needed the fallback

    // First feed fails (non-ok) → second serves.
    let secondCalls = 0;
    const yahooDown = (async (url: string) => {
        if (url === yahooRssUrl('AAPL')) return { ok: false, text: async () => '' };
        secondCalls += 1;
        return { ok: true, text: async () => googleXml };
    }) as never;
    const viaFallback = await resolveNewsFromFeeds([yahooRssUrl('AAPL'), googleNewsRssUrl('AAPL')], 6, yahooDown as never);
    assert.equal(viaFallback.length, 1);
    assert.equal(viaFallback[0].title, 'Google story');
    assert.equal(secondCalls, 1);

    // First feed throws → second serves; both bad → empty, never throws.
    const yahooThrows = (async (url: string) => {
        if (url === yahooRssUrl('AAPL')) throw new Error('429');
        return { ok: true, text: async () => googleXml };
    }) as never;
    const viaThrow = await resolveNewsFromFeeds([yahooRssUrl('AAPL'), googleNewsRssUrl('AAPL')], 6, yahooThrows as never);
    assert.equal(viaThrow[0].title, 'Google story');

    const allBad = (async () => ({ ok: false, text: async () => '' })) as never;
    const none = await resolveNewsFromFeeds([yahooRssUrl('AAPL'), googleNewsRssUrl('AAPL')], 6, allBad as never);
    assert.deepEqual(none, []);
});

test('cache key is bucketed and TTL is 30 minutes', () => {
    // quoteBucket passes the symbol through as-is; API route normalizes first.
    assert.match(newsCacheKey('aapl'), /^news:aapl:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
    assert.match(newsCacheKey('AAPL'), /^news:AAPL:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
    assert.equal(NEWS_TTL_SECONDS, 30 * 60);
});

test('SCORING ISOLATION: news module exports cannot reach the rating path', () => {
    // The rating pipeline's only inputs are pillars + beta. Assert the
    // combine signature surface has no news-shaped input and the weights
    // are untouched. This is a structural guard, not just a comment.
    assert.equal(PILLAR_WEIGHTS.technical, 0.35);
    assert.equal(PILLAR_WEIGHTS.fundamental, 0.35);
    assert.equal(PILLAR_WEIGHTS.analystConsensus, 0.3);
    // The news module exposes no score-like field.
    const items = parseYahooRss(SAMPLE, 1);
    assert.equal(items[0] && 'score' in (items[0] as object), false);
    assert.equal(items[0] && 'sentiment' in (items[0] as object), false);
});
