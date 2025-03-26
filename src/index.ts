import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'
import { formatContentQuery, scrape, ask } from './utils';

export interface Env {
	SHARED_SECRET: string
	FIRE_CRAWL_API_KEY: string
  GEMINI_API_KEY: string
  CONTENT_CACHE: KVNamespace
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * Scrapes content from a URL and asks a question about it.
   * @param url {string} the URL to scrape content from
   * @param question {string} the question to ask about the content
   * @return {Promise<string>} the AI's response about the content
   */
  async askAboutUrl(url: string, question: string): Promise<string> {
    const cacheKey = `${url}:${question}`;
    
    // Try to get from cache first
    const cachedResponse = await this.env.CONTENT_CACHE.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, proceed with API calls
    const content = await scrape(url, this.env.FIRE_CRAWL_API_KEY);
    const prompt = formatContentQuery(content, question);
    const response = await ask(prompt, this.env.GEMINI_API_KEY);
    
    // Cache the response for future use (cache for 24 hours)
    await this.env.CONTENT_CACHE.put(cacheKey, response, { expirationTtl: 86400 });
    
    return response;
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    return new ProxyToSelf(this).fetch(request)
  }
}
