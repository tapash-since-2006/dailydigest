/**
 * fetchers/news.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * News fetchers: RSS (30+ feeds), Hacker News, Tavily, Exa, NewsAPI, GNews,
 * Currents, NYTimes, Mediastack, NewsData, WorldNewsAPI, NewsCatcher.
 *
 * All fetchers run concurrently with a 90s global timeout.
 * Results are deduplicated per section before being passed to AI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";
import Parser from "rss-parser";
import { KEYS } from "../config";
import { log, isJunkTitle } from "../utils";
import { NewsItem, PreFetchedData, MarketData } from "../types";

const TIMEOUT = 15_000;
const USER_AGENT = "Mozilla/5.0 (digest-bot/1.0)";
const rssParser = new Parser({ timeout: TIMEOUT });

// ── RSS Feed Definitions ──────────────────────────────────────────────────────

const RSS_FEEDS: Record<string, string[]> = {
  global: [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.reuters.com/reuters/worldNews",
    "https://feeds.reuters.com/reuters/topNews",
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://www.theguardian.com/world/rss",
    "https://feeds.washingtonpost.com/rss/world",
    "https://feeds.bloomberg.com/markets/news.rss",
    "https://feeds.bloomberg.com/politics/news.rss",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://moxie.foxnews.com/google-publisher/world.xml",
    "https://news.yahoo.com/rss/mostviewed",
    "https://www.ft.com/rss/home/international",
    "https://www.reddit.com/r/worldnews.rss",
  ],
  india: [
    "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/feeder/default.rss",
    "https://www.thehindu.com/feedly/s1/india/feedly.rss",
    "https://economictimes.indiatimes.com/rssfeed/1977021501.cms",
    "https://feeds.feedburner.com/ndtvnews-top-stories",
    "https://feeds.feedburner.com/ndtvnews-india-news",
    "https://feeds.feedburner.com/ndtvnews-trending-news",
    "https://feeds.feedburner.com/ndtvprofit-latest",
    "https://www.business-standard.com/rss/latest.rss",
    "https://www.business-standard.com/rss/home_page_top_stories.rss",
    "https://www.livemint.com/rss/news",
    "https://www.moneycontrol.com/rss/lateststories.xml",
  ],
  tech: [
    "https://feeds.bloomberg.com/technology/news.rss",
    "https://feeds.arstechnica.com/arstechnica/index",
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://www.wired.com/feed/rss",
    "https://www.technologyreview.com/feed/",
    "https://www.forbes.com/innovation/feed",
  ],
  startups: [
    "https://techcrunch.com/category/venture/feed/",
    "https://news.crunchbase.com/feed/",
    "https://feeds.feedburner.com/venturebeat/SZYF",
    "https://news.ycombinator.com/rss",
  ],
  investing: [
    "https://feeds.bloomberg.com/markets/news.rss",
    "https://www.cnbc.com/id/15839135/device/rss/rss.html",
    "https://www.ft.com/rss/home/international",
  ],
  career: [
    "https://hbr.org/resources/xml/rss/career.xml",
    "https://www.forbes.com/leadership/feed",
  ],
  personal_finance: [
    "https://www.cnbc.com/id/10001054/device/rss/rss.html",
    "https://feeds.feedburner.com/ndtvprofit-latest",
  ],
};

const FURTHER_READING_FEEDS = [
  "https://fortune.com/feed/",
  "https://www.ft.com/?format=rss",
  "https://www.forbes.com/innovation/feed",
  "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
  "https://techcrunch.com/feed/",
  "https://feeds.bloomberg.com/markets/news.rss",
];

// ── RSS fetcher (single feed) ─────────────────────────────────────────────────

async function fetchRssFeed(url: string, maxItems = 10): Promise<string[]> {
  try {
    const feed = await rssParser.parseURL(url);
    return (feed.items ?? [])
      .slice(0, maxItems)
      .map((item) => item.title?.trim() ?? "")
      .filter((title) => title && !isJunkTitle(title));
  } catch {
    return [];
  }
}

// ── RSS section fetcher (tries feeds until we have results) ───────────────────

async function fetchRssSection(
  section: string,
  maxTotal = 15,
): Promise<string[]> {
  const feeds = RSS_FEEDS[section] ?? [];
  const results: string[] = [];
  const seen = new Set<string>();

  // Fire all feeds concurrently for speed, then merge
  const allResults = await Promise.allSettled(
    feeds.map((url) => fetchRssFeed(url, 10)),
  );

  for (const r of allResults) {
    if (r.status !== "fulfilled") continue;
    for (const title of r.value) {
      const key = title.toLowerCase().slice(0, 60);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(title);
        if (results.length >= maxTotal) break;
      }
    }
    if (results.length >= maxTotal) break;
  }

  return results;
}

// ── Hacker News ───────────────────────────────────────────────────────────────

async function fetchHackerNews(): Promise<string[]> {
  try {
    const { data: ids } = await axios.get<number[]>(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { timeout: TIMEOUT },
    );

    const top = ids.slice(0, 30);
    const stories = await Promise.allSettled(
      top.map((id) =>
        axios
          .get<{
            title: string;
            type: string;
          }>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5_000 })
          .then((r) => r.data),
      ),
    );

    return stories
      .filter(
        (r): r is PromiseFulfilledResult<{ title: string; type: string }> =>
          r.status === "fulfilled" && r.value?.type === "story",
      )
      .map((r) => r.value.title)
      .filter((title) => !isJunkTitle(title))
      .slice(0, 15);
  } catch (err) {
    log("WARN", `  HN fetch failed: ${(err as Error).message}`);
    return [];
  }
}

// ── Tavily ────────────────────────────────────────────────────────────────────

async function fetchTavilySection(query: string): Promise<string[]> {
  if (!KEYS.TAVILY) return [];
  try {
    const { data } = await axios.post(
      "https://api.tavily.com/search",
      { query, search_depth: "basic", max_results: 10, include_answer: false },
      {
        headers: {
          Authorization: `Bearer ${KEYS.TAVILY}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      },
    );
    return (data?.results ?? [])
      .map((r: any) => {
        const src = r.url ? ` [SRC:${r.url}]` : "";
        return `${r.title}${src}`;
      })
      .filter((t: string) => !isJunkTitle(t));
  } catch (err) {
    log(
      "WARN",
      `  Tavily (${query.slice(0, 30)}) failed: ${(err as Error).message}`,
    );
    return [];
  }
}

// ── Exa ───────────────────────────────────────────────────────────────────────

async function fetchExaSection(query: string): Promise<string[]> {
  if (!KEYS.EXA) return [];
  try {
    const { data } = await axios.post(
      "https://api.exa.ai/search",
      {
        query,
        numResults: 10,
        type: "neural",
        useAutoprompt: true,
        startPublishedDate: new Date(Date.now() - 86400_000 * 2).toISOString(),
      },
      {
        headers: { "x-api-key": KEYS.EXA, "Content-Type": "application/json" },
        timeout: 20_000,
      },
    );
    return (data?.results ?? [])
      .map((r: any) => {
        const src = r.url ? ` [SRC:${r.url}]` : "";
        return `${r.title}${src}`;
      })
      .filter((t: string) => !isJunkTitle(t));
  } catch (err) {
    log(
      "WARN",
      `  Exa (${query.slice(0, 30)}) failed: ${(err as Error).message}`,
    );
    return [];
  }
}

// ── NewsAPI ───────────────────────────────────────────────────────────────────

async function fetchNewsApi(query: string): Promise<string[]> {
  if (!KEYS.NEWS_API) return [];
  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query,
        sortBy: "publishedAt",
        pageSize: 10,
        language: "en",
        apiKey: KEYS.NEWS_API,
      },
      timeout: TIMEOUT,
    });
    return (data?.articles ?? [])
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  NewsAPI (${query}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── GNews ─────────────────────────────────────────────────────────────────────

// ── GNews ─────────────────────────────────────────────────────────────────────

// A simple global queue to ensure GNews requests run sequentially
let gnewsQueue = Promise.resolve<string[]>([]);

async function fetchGNews(query: string): Promise<string[]> {
  if (!KEYS.GNEWS) return [];

  // Chain this new request onto the end of the existing queue
  const task = gnewsQueue.then(async () => {
    try {
      const { data } = await axios.get("https://gnews.io/api/v4/search", {
        params: { q: query, lang: "en", max: 10, apikey: KEYS.GNEWS },
        timeout: TIMEOUT,
      });

      // WAIT 1 second after a successful request before allowing the next one
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return (data?.articles ?? [])
        .map((a: any) => a.title)
        .filter((t: string) => t && !isJunkTitle(t));
    } catch (err) {
      log("WARN", `  GNews (${query}) failed: ${(err as Error).message}`);

      // Still wait 1 second on a failure to let the API cool down
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return [];
    }
  });

  // Update the queue reference so the next call waits for this one to finish
  // (We catch errors here so one failed request doesn't break the whole chain)
  gnewsQueue = task.catch(() => []);

  return task;
}

// ── Currents API ──────────────────────────────────────────────────────────────

async function fetchCurrents(keywords: string): Promise<string[]> {
  if (!KEYS.CURRENTS) return [];
  try {
    const { data } = await axios.get(
      "https://api.currentsapi.services/v1/search",
      {
        params: { keywords, language: "en", limit: 10, apiKey: KEYS.CURRENTS },
        timeout: TIMEOUT,
      },
    );
    return (data?.news ?? [])
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  Currents (${keywords}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── NYTimes ───────────────────────────────────────────────────────────────────

async function fetchNYTimes(section: string): Promise<string[]> {
  if (!KEYS.NYTIMES) return [];
  try {
    const { data } = await axios.get(
      `https://api.nytimes.com/svc/topstories/v2/${section}.json`,
      { params: { "api-key": KEYS.NYTIMES }, timeout: TIMEOUT },
    );
    return (data?.results ?? [])
      .slice(0, 10)
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  NYTimes (${section}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── NewsData.io ───────────────────────────────────────────────────────────────

async function fetchNewsDataIo(query: string): Promise<string[]> {
  if (!KEYS.NEWSDATAIO) return [];
  try {
    const { data } = await axios.get("https://newsdata.io/api/1/news", {
      params: { q: query, language: "en", size: 10, apikey: KEYS.NEWSDATAIO },
      timeout: TIMEOUT,
    });
    return (data?.results ?? [])
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  NewsDataIO (${query}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── WorldNewsAPI ──────────────────────────────────────────────────────────────

async function fetchWorldNewsApi(text: string): Promise<string[]> {
  if (!KEYS.WORLDNEWSAPI) return [];
  try {
    const { data } = await axios.get(
      "https://api.worldnewsapi.com/search-news",
      {
        params: {
          text,
          language: "en",
          number: 10,
          "api-key": KEYS.WORLDNEWSAPI,
        },
        timeout: TIMEOUT,
      },
    );
    return (data?.news ?? [])
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  WorldNewsAPI (${text}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── NewsCatcher ───────────────────────────────────────────────────────────────

async function fetchNewsCatcher(q: string): Promise<string[]> {
  if (!KEYS.NEWSCATCHER) return [];
  try {
    const { data } = await axios.get(
      "https://v3-api.newscatcherapi.com/api/search",
      {
        params: { q, lang: "en", page_size: 10 },
        headers: { "x-api-token": KEYS.NEWSCATCHER },
        timeout: TIMEOUT,
      },
    );
    return (data?.articles ?? [])
      .map((a: any) => a.title)
      .filter((t: string) => t && !isJunkTitle(t));
  } catch (err) {
    log("WARN", `  NewsCatcher (${q}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── Section merger — combines RSS + API results, deduplicates ─────────────────

function mergeUnique(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item
        .replace(/\[SRC:[^\]]+\]/g, "")
        .toLowerCase()
        .slice(0, 60)
        .trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// ── Main prefetch orchestrator ────────────────────────────────────────────────

export async function prefetchAllNews(
  market: MarketData,
): Promise<Omit<PreFetchedData, "market">> {
  log("FETCH", "Starting concurrent news prefetch (90s timeout)...");

  const GLOBAL_TIMEOUT = 90_000;

  const withTimeout = <T>(p: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((resolve) =>
        setTimeout(() => resolve(fallback), GLOBAL_TIMEOUT),
      ),
    ]);

  // Fire everything concurrently
  const [
    rssGlobal,
    rssIndia,
    rssTech,
    rssStartups,
    rssInvesting,
    rssCareer,
    rssPF,
    hnTitles,
    tavilyGlobal,
    tavilyIndia,
    tavilyTech,
    tavilyStartups,
    tavilyInvesting,
    exaGlobal,
    exaIndia,
    exaTech,
    newsApiGlobal,
    newsApiIndia,
    newsApiTech,
    gnewsGlobal,
    gnewsIndia,
    gnewsTech,
    currentsGlobal,
    currentsIndia,
    currentsTech,
    nytGlobal,
    nytTech,
    newsdataGlobal,
    newsdataIndia,
    newsdataTech,
    worldnewsGlobal,
    newscatcherGlobal,
    newscatcherTech,
  ] = await Promise.all([
    withTimeout(fetchRssSection("global"), []),
    withTimeout(fetchRssSection("india"), []),
    withTimeout(fetchRssSection("tech"), []),
    withTimeout(fetchRssSection("startups"), []),
    withTimeout(fetchRssSection("investing"), []),
    withTimeout(fetchRssSection("career"), []),
    withTimeout(fetchRssSection("personal_finance"), []),

    withTimeout(fetchHackerNews(), []),

    withTimeout(fetchTavilySection("world news today"), []),
    withTimeout(fetchTavilySection("India news today"), []),
    withTimeout(fetchTavilySection("AI technology news today"), []),
    withTimeout(fetchTavilySection("startup funding news today"), []),
    withTimeout(fetchTavilySection("stock market investing news today"), []),

    withTimeout(fetchExaSection("major world news today"), []),
    withTimeout(fetchExaSection("India news politics economy today"), []),
    withTimeout(fetchExaSection("AI tech news today"), []),

    withTimeout(fetchNewsApi("world news"), []),
    withTimeout(fetchNewsApi("India"), []),
    withTimeout(fetchNewsApi("technology AI"), []),

    withTimeout(fetchGNews("world news"), []),
    withTimeout(fetchGNews("India"), []),
    withTimeout(fetchGNews("technology"), []),

    withTimeout(fetchCurrents("world"), []),
    withTimeout(fetchCurrents("India"), []),
    withTimeout(fetchCurrents("technology"), []),

    withTimeout(fetchNYTimes("world"), []),
    withTimeout(fetchNYTimes("technology"), []),

    withTimeout(fetchNewsDataIo("world news"), []),
    withTimeout(fetchNewsDataIo("India news"), []),
    withTimeout(fetchNewsDataIo("AI technology"), []),

    withTimeout(fetchWorldNewsApi("world news today"), []),

    withTimeout(fetchNewsCatcher("world news"), []),
    withTimeout(fetchNewsCatcher("AI technology"), []),
  ]);

  const globalNews = mergeUnique([
    tavilyGlobal,
    rssGlobal,
    exaGlobal,
    newsApiGlobal,
    gnewsGlobal,
    currentsGlobal,
    nytGlobal,
    newsdataGlobal,
    worldnewsGlobal,
    newscatcherGlobal,
  ]).slice(0, 20);
  const indiaNews = mergeUnique([
    tavilyIndia,
    rssIndia,
    exaIndia,
    newsApiIndia,
    gnewsIndia,
    currentsIndia,
    newsdataIndia,
  ]).slice(0, 20);
  const techNews = mergeUnique([
    tavilyTech,
    rssTech,
    exaTech,
    newsApiTech,
    gnewsTech,
    currentsTech,
    nytTech,
    newsdataTech,
    newscatcherTech,
  ]).slice(0, 20);
  const startupsNews = mergeUnique([tavilyStartups, rssStartups]).slice(0, 15);
  const investingNews = mergeUnique([tavilyInvesting, rssInvesting]).slice(
    0,
    15,
  );
  const careerNews = mergeUnique([rssCareer]).slice(0, 10);
  const pfNews = mergeUnique([rssPF]).slice(0, 10);

  log(
    "FETCH",
    `Prefetch done. Global: ${globalNews.length}, India: ${indiaNews.length}, Tech: ${techNews.length}, HN: ${hnTitles.length}`,
  );

  return {
    hn: hnTitles,
    globalNews,
    indiaNews,
    techNews,
    startupsNews,
    investingNews,
    careerNews,
    pfNews,
  };
}

// ── Further reading links ─────────────────────────────────────────────────────

export async function fetchFurtherReading(): Promise<
  { title: string; url: string }[]
> {
  const results = await Promise.allSettled(
    FURTHER_READING_FEEDS.map((url) =>
      rssParser.parseURL(url).then((feed) =>
        (feed.items ?? [])
          .slice(0, 3)
          .map((item) => ({
            title: item.title?.trim() ?? "",
            url: item.link ?? "",
          }))
          .filter((i) => i.title && i.url),
      ),
    ),
  );

  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        out.push(item);
      }
    }
  }

  return out.slice(0, 10);
}
