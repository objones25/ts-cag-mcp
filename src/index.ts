import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'
import { formatContentQuery, scrape, ask } from './utils';

export interface Env {
	SHARED_SECRET: string
	FIRE_CRAWL_API_KEY: string
  GEMINI_API_KEY: string
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * Scrapes content from a URL and asks a question about it.
   * @param url {string} the URL to scrape content from
   * @param question {string} the question to ask about the content
   * @return {Promise<string>} the AI's response about the content
   */
  async askAboutUrl(url: string, question: string): Promise<string> {
    // First scrape the content
    const content = await scrape(url, this.env.FIRE_CRAWL_API_KEY);
    
    // Format the prompt with content and question
    const prompt = formatContentQuery(content, question);
    
    // Ask Gemini about the content
    return ask(prompt, this.env.GEMINI_API_KEY);
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    return new ProxyToSelf(this).fetch(request)
  }
}
