const DEFAULT_MODEL = '@cf/openai/gpt-oss-120b';
const GENERIC_HASHTAGS = ['entrepreneuriat', 'business', 'interview', 'conseils', 'shorts'];

export async function generateContentMetadata(env, input = {}) {
  const topic = buildTopic(input);
  const trend = await collectTrendSignals(env, topic);
  const fallback = fallbackMetadata(input, trend);
  if (!env.AI) return { ...fallback, generationStatus: 'fallback', aiModel: 'deterministic-fallback' };

  const system = `Tu es Neptune IA, directeur éditorial spécialisé dans les shorts d'interviews entrepreneuriales.
Tu produis un titre très accrocheur mais honnête, jamais mensonger ni trompeur.
La description doit provoquer une discussion naturelle avec une à trois questions directement liées au titre.
Le ton est oral, clair et humain. Maximum un emoji. Aucun jargon marketing creux.
Tu peux utiliser des principes éditoriaux généraux observés dans les grandes interviews et le divertissement français : accroche immédiate, tension claire, contexte bref, curiosité, rythme et question ouverte. Tu ne dois pas imiter la voix, les formulations ou la personnalité d'un créateur identifiable.
Les hashtags doivent être réellement pertinents pour le sujet. Priorise les signaux des sept derniers jours fournis. N'invente jamais un signal tendance absent des données.
Réponds uniquement en JSON strict :
{"title":"...","description":"...","hashtags":["..."],"trendSummary":"..."}`;

  const prompt = {
    filename: input.filename || '',
    orderTitle: input.orderTitle || '',
    format: input.format || '',
    clientName: input.clientName || '',
    company: input.company || '',
    editorialContext: input.editorialContext || '',
    topic,
    sevenDaySignals: trend,
  };

  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
      temperature: 0.35,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    });
    const content = result?.response || result?.result?.response || result?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonObject(content);
    return {
      title: clean(parsed.title, 140) || fallback.title,
      description: clean(parsed.description, 1800) || fallback.description,
      hashtags: normalizeHashtags(parsed.hashtags, trend.hashtags),
      trendSummary: clean(parsed.trendSummary, 1200) || trend.summary,
      trendSources: trend.sources,
      generationStatus: 'generated',
      aiModel: env.AI_MODEL || DEFAULT_MODEL,
    };
  } catch (error) {
    console.error('content_ai_generation_failed', error);
    return { ...fallback, generationStatus: 'fallback', aiModel: env.AI_MODEL || DEFAULT_MODEL };
  }
}

async function collectTrendSignals(env, topic) {
  const sources = [];
  const hashtags = [];
  const samples = [];

  if (env.YOUTUBE_DATA_API_KEY) {
    try {
      const youtube = await youtubeSignals(env.YOUTUBE_DATA_API_KEY, topic);
      if (youtube.samples.length) {
        sources.push('YouTube · 7 jours');
        samples.push(...youtube.samples);
        hashtags.push(...youtube.hashtags);
      }
    } catch (error) {
      console.error('youtube_trends_failed', error);
    }
  }

  if (env.NEPTUNE_TRENDS_API_URL) {
    try {
      const response = await fetch(env.NEPTUNE_TRENDS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.NEPTUNE_TRENDS_API_TOKEN ? { Authorization: `Bearer ${env.NEPTUNE_TRENDS_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ topic, windowDays: 7, platforms: ['tiktok', 'instagram'] }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        for (const platform of ['tiktok', 'instagram']) {
          const signal = data?.[platform];
          if (!signal) continue;
          const platformSamples = Array.isArray(signal.samples) ? signal.samples : [];
          const platformHashtags = Array.isArray(signal.hashtags) ? signal.hashtags : [];
          if (platformSamples.length || platformHashtags.length) {
            sources.push(`${platform === 'tiktok' ? 'TikTok' : 'Instagram'} · 7 jours`);
            samples.push(...platformSamples.slice(0, 12).map((item) => clean(item, 220)).filter(Boolean));
            hashtags.push(...platformHashtags);
          }
        }
      }
    } catch (error) {
      console.error('social_trends_failed', error);
    }
  }

  const normalizedHashtags = normalizeHashtags(hashtags, []);
  const summary = sources.length
    ? `${sources.join(' · ')} analysés. ${samples.length} signaux éditoriaux retenus.`
    : 'Aucune source sociale temps réel configurée : génération fondée sur le contexte du short et des principes éditoriaux durables.';
  return { sources, hashtags: normalizedHashtags, samples: samples.slice(0, 24), summary };
}

async function youtubeSignals(apiKey, topic) {
  const publishedAfter = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const search = new URL('https://www.googleapis.com/youtube/v3/search');
  search.searchParams.set('part', 'snippet');
  search.searchParams.set('type', 'video');
  search.searchParams.set('maxResults', '15');
  search.searchParams.set('order', 'viewCount');
  search.searchParams.set('publishedAfter', publishedAfter);
  search.searchParams.set('regionCode', 'FR');
  search.searchParams.set('relevanceLanguage', 'fr');
  search.searchParams.set('safeSearch', 'moderate');
  search.searchParams.set('q', topic || 'entrepreneuriat interview');
  search.searchParams.set('key', apiKey);
  const response = await fetch(search.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`youtube_search_${response.status}`);
  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const ids = items.map((item) => item?.id?.videoId).filter(Boolean);
  const samples = items.map((item) => clean(item?.snippet?.title, 220)).filter(Boolean);
  const hashtags = samples.flatMap(extractHashtags);

  if (ids.length) {
    const videos = new URL('https://www.googleapis.com/youtube/v3/videos');
    videos.searchParams.set('part', 'snippet,statistics');
    videos.searchParams.set('id', ids.join(','));
    videos.searchParams.set('key', apiKey);
    const details = await fetch(videos.toString(), { headers: { Accept: 'application/json' } });
    if (details.ok) {
      const detailData = await details.json();
      for (const item of Array.isArray(detailData.items) ? detailData.items : []) {
        hashtags.push(...(Array.isArray(item?.snippet?.tags) ? item.snippet.tags : []));
        hashtags.push(...extractHashtags(item?.snippet?.description || ''));
      }
    }
  }
  return { samples, hashtags: normalizeHashtags(hashtags, []) };
}

function fallbackMetadata(input, trend) {
  const base = clean(stripExtension(input.filename || input.orderTitle || 'Le conseil que personne ne vous donne'), 110);
  const title = base && base.length > 12 ? base : 'Ce conseil peut vous faire gagner des mois';
  const description = `Vous êtes d’accord avec cette idée ? Qu’est-ce qui vous a le plus surpris dans cet extrait ? Dites-nous comment vous le vivez dans votre activité.`;
  return {
    title,
    description,
    hashtags: normalizeHashtags(trend.hashtags, GENERIC_HASHTAGS),
    trendSummary: trend.summary,
    trendSources: trend.sources,
  };
}

function buildTopic(input) {
  return [input.editorialContext, input.orderTitle, input.format, input.company, stripExtension(input.filename)]
    .map((value) => clean(value, 240))
    .filter(Boolean)
    .join(' · ')
    .slice(0, 500) || 'entrepreneuriat interview conseil business';
}

function normalizeHashtags(value, fallback = GENERIC_HASHTAGS) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/u);
  const cleaned = values.map((tag) => String(tag || '').trim().replace(/^#+/u, '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 48)).filter(Boolean);
  const unique = [...new Set(cleaned)];
  const result = unique.length ? unique : fallback;
  return result.slice(0, 8);
}

function extractHashtags(value) {
  return [...String(value || '').matchAll(/#([\p{L}\p{N}_]{2,48})/gu)].map((match) => match[1]);
}

function stripExtension(value) { return String(value || '').replace(/\.[a-z0-9]{2,5}$/iu, '').replace(/[_-]+/gu, ' ').trim(); }
function clean(value, limit) { return String(value || '').replace(/\s+/gu, ' ').trim().slice(0, limit); }
function parseJsonObject(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value || '').trim();
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) return {};
    try { return JSON.parse(match[0]); } catch { return {}; }
  }
}
