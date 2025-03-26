import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { GoogleGenAI } from "@google/genai";
import { formatContentQuery } from './utils';

export interface Env {
	SHARED_SECRET: string
	FIRE_CRAWL_API_KEY: string
  GEMINI_API_KEY: string
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * Scrapes a website and returns its content as markdown.
   * @param url {string} the URL of the website to scrape.
   * @return {Promise<string>} the scraped content in markdown format.
   */
  async scrape(url: string): Promise<string> {
    const app = new FirecrawlApp({ apiKey: this.env.FIRE_CRAWL_API_KEY });
    
    const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse;
    
    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`);
    }
    
    return scrapeResult.markdown || '';
  }

  /**
   * Asks Gemini AI a question.
   * @param question {string} the question to ask.
   * @return {Promise<string>} the AI's response.
   */
  async ask(question: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: question,
    });
    return response.text || '';
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    return new ProxyToSelf(this).fetch(request)
  }

  /**
   * Scrapes content from a URL and asks a question about it.
   * @param url {string} the URL to scrape content from
   * @param question {string} the question to ask about the content
   * @return {Promise<string>} the AI's response about the content
   */
  async askAboutUrl(url: string, question: string): Promise<string> {
    // First scrape the content
    const content = await this.scrape(url);
    
    // Format the prompt with content and question
    const prompt = formatContentQuery(content, question);
    
    // Ask Gemini about the content
    return this.ask(prompt);
  }
}
