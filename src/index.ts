import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'
import { formatContentQuery, ask, scrapeContent } from './utils';

export interface Env {
	SHARED_SECRET: string
	FIRE_CRAWL_API_KEY: string
  GEMINI_API_KEY: string
  CONTENT_CACHE: KVNamespace  // Combined cache for all content
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * Scrapes content from a URL and asks a question about it.
   * @param url {string} the URL to scrape content from
   * @param question {string} the question to ask about the content
   * @return {Promise<string>} the AI's response about the content
   */
  async askAboutUrl(url: string, question: string): Promise<string> {
    // Use two distinct cache keys
    const responseCacheKey = `r:${url}:${question}`;
    const contentCacheKey = `c:${url}`;
    
    // Try to get the AI response from cache first
    const cachedResponse = await this.env.CONTENT_CACHE.get(responseCacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      // Determine complexity of the query
      const isComplexQuery = question.length > 50 || 
                           question.includes('how') ||
                           question.includes('explain') ||
                           question.includes('compare');
      
      // Try to get scraped content from cache
      let content = await this.env.CONTENT_CACHE.get(contentCacheKey);
      
      // If no cached content, scrape it
      if (!content) {
        content = await scrapeContent(url, this.env.FIRE_CRAWL_API_KEY, isComplexQuery);
        
        // Cache scraped content for 1 week
        await this.env.CONTENT_CACHE.put(contentCacheKey, content, { expirationTtl: 604800 });
      }
      
      // Format prompt and get AI response
      const prompt = formatContentQuery(content, question);
      const response = await ask(prompt, this.env.GEMINI_API_KEY);
      
      // Cache the response for 24 hours
      await this.env.CONTENT_CACHE.put(responseCacheKey, response, { expirationTtl: 86400 });
      
      return response;
    } catch (error) {
      console.error('Error in askAboutUrl:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Return user-friendly error messages
      if (errorMessage.includes('Failed to scrape')) {
        return `I'm sorry, I was unable to access the content at that URL. Please check the URL or try a different source.`;
      }
      
      if (errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return `I encountered a temporary limit while processing your request. Please try again in a few moments.`;
      }
      
      return `I encountered an error processing your request. Please try again or use a different URL.`;
    }
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    return new ProxyToSelf(this).fetch(request)
  }
}
