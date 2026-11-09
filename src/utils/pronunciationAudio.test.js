import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDictionaryLookupUrl,
  extractPronunciationAudioUrls,
  fetchPronunciationUrl,
  normalizePronunciationWord,
  pickPronunciationAudioUrl,
  playPronunciationUrl,
  preloadPronunciationUrls,
} from "./pronunciationAudio.js";

test("normalizes pronunciation words", () => {
  assert.equal(normalizePronunciationWord("  Apple "), "apple");
  assert.equal(normalizePronunciationWord("T-Shirts"), "t-shirts");
  assert.equal(normalizePronunciationWord(null), "");
});

test("builds dictionary lookup url", () => {
  assert.equal(
    buildDictionaryLookupUrl("hello"),
    "https://api.dictionaryapi.dev/api/v2/entries/en/hello",
  );
  assert.equal(
    buildDictionaryLookupUrl("ice cream"),
    "https://api.dictionaryapi.dev/api/v2/entries/en/ice%20cream",
  );
});

test("extracts and prefers US audio", () => {
  const entries = [
    {
      phonetics: [
        { audio: "https://example.com/en_apple--_gb_1.mp3" },
        { audio: "https://example.com/en_apple--_us_1.mp3" },
      ],
    },
  ];

  assert.deepEqual(extractPronunciationAudioUrls(entries), [
    "https://example.com/en_apple--_gb_1.mp3",
    "https://example.com/en_apple--_us_1.mp3",
  ]);
  assert.equal(
    pickPronunciationAudioUrl(entries),
    "https://example.com/en_apple--_us_1.mp3",
  );
  assert.equal(pickPronunciationAudioUrl([]), "");
  assert.equal(pickPronunciationAudioUrl(null), "");
});

test("fetches pronunciation url and caches it", async () => {
  const cache = new Map();
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => [
        { phonetics: [{ audio: "https://example.com/apple-us.mp3" }] },
      ],
    };
  };

  const first = await fetchPronunciationUrl("Apple", { fetchFn, cache });
  const second = await fetchPronunciationUrl("apple", { fetchFn, cache });

  assert.equal(first, "https://example.com/apple-us.mp3");
  assert.equal(second, "https://example.com/apple-us.mp3");
  assert.equal(calls, 1);
});

test("fetch failure returns empty without throwing", async () => {
  const failing = async () => {
    throw new Error("blocked");
  };
  const notFound = async () => ({ ok: false });

  assert.equal(await fetchPronunciationUrl("apple", { fetchFn: failing }), "");
  assert.equal(await fetchPronunciationUrl("apple", { fetchFn: notFound }), "");
  assert.equal(await fetchPronunciationUrl("   "), "");
});

test("preload dedupes and limits words", async () => {
  const cache = new Map();
  const seen = [];
  const fetchFn = async (url) => {
    seen.push(url);
    return {
      ok: true,
      json: async () => [{ phonetics: [{ audio: `${url}.mp3` }] }],
    };
  };

  const result = await preloadPronunciationUrls(
    ["apple", "Apple", "banana", "cat"],
    { fetchFn, cache, limit: 2, concurrency: 2 },
  );

  assert.equal(result.size, 2);
  assert.equal(seen.length, 2);
});

test("playPronunciationUrl resolves on ended and rejects on empty", async () => {
  await assert.rejects(() => playPronunciationUrl(""));

  class FakeAudio {
    constructor(src) {
      this.src = src;
      FakeAudio.last = this;
    }

    play() {
      setTimeout(() => this.onended?.(), 0);
      return Promise.resolve();
    }
  }

  await playPronunciationUrl("https://example.com/a.mp3", {
    AudioClass: FakeAudio,
  });
  assert.equal(FakeAudio.last.src, "https://example.com/a.mp3");

  class FailingAudio {
    play() {
      return Promise.reject(new Error("not-allowed"));
    }
  }

  await assert.rejects(() =>
    playPronunciationUrl("https://example.com/a.mp3", {
      AudioClass: FailingAudio,
    }),
  );
});
