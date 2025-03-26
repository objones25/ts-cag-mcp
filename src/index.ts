import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'
import { formatContentQuery, scrape, ask, scrapeWithRelatedPages } from './utils';

export interface Env {
	SHARED_SECRET: string
	FIRE_CRAWL_API_KEY: string
  GEMINI_API_KEY: string
  CONTENT_CACHE: KVNamespace  // Cache for AI responses
  SCRAPE_CACHE: KVNamespace   // Cache for scraped content
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * Scrapes content from a URL and asks a question about it.
   * @param url {string} the URL to scrape content from
   * @param question {string} the question to ask about the content
   * @return {Promise<string>} the AI's response about the content
   */
  async askAboutUrl(url: string, question: string): Promise<string> {
    const responseCacheKey = `response:${url}:${question}`;
    const scrapeCacheKey = `scrape:${url}`;
    
    // Try to get the AI response from cache first
    const cachedResponse = await this.env.CONTENT_CACHE.get(responseCacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      // Try to get scraped content from cache
      let content = await this.env.SCRAPE_CACHE.get(scrapeCacheKey);
      
      if (!content) {
        // Determine if multi-page scraping would be beneficial
        const isDocSite = url.includes('/docs/') || 
                         url.includes('/documentation/') ||
                         url.includes('github.com/') ||
                         url.includes('api-reference') ||
                         url.includes('/guide/');
        
        // Complex questions typically benefit from more context
        const isComplexQuery = question.length > 50 || 
                             question.includes('how') ||
                             question.includes('explain') ||
                             question.includes('compare');
                             
        // Use multi-page scraping for documentation sites with complex queries
        if (isDocSite && isComplexQuery) {
          content = await scrapeWithRelatedPages(url, this.env.FIRE_CRAWL_API_KEY, 3);
        } else {
          content = await scrape(url, this.env.FIRE_CRAWL_API_KEY);
        }
        
        // Cache scraped content for 1 week (content changes less frequently)
        await this.env.SCRAPE_CACHE.put(scrapeCacheKey, content, { expirationTtl: 604800 });
      }
      
      const prompt = formatContentQuery(content, question);
      const response = await ask(prompt, this.env.GEMINI_API_KEY);
      
      // Cache AI response for 24 hours (responses might need to be fresher)
      await this.env.CONTENT_CACHE.put(responseCacheKey, response, { expirationTtl: 86400 });
      
      return response;
    } catch (error) {
      console.error('Error in askAboutUrl:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If we failed to scrape, respond gracefully
      if (errorMessage.includes('Failed to scrape')) {
        return `I'm sorry, I was unable to access the content at that URL. This could be due to:
- The website blocking automated access
- The URL being invalid or requiring authentication
- The site's structure being incompatible with our scraper

Could you check the URL and try again, or perhaps provide a different source?`;
      }
      
      // For API errors (like Gemini limits)
      if (errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return `I'm sorry, I encountered a temporary limit while processing your request. Please try again in a few moments.`;
      }
      
      // Generic error
      return `I apologize, but I encountered an error while processing your request: ${errorMessage}. Please try again or try with a different URL.`;
    }
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    return new ProxyToSelf(this).fetch(request)
  }
}
