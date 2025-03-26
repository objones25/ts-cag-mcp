import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { GoogleGenAI } from "@google/genai";

/**
 * Formats a prompt for asking questions about content
 */
export function formatContentQuery(content: string, question: string): string {
  return `Given this content:
${content}

Answer this question: ${question}`;
}

/**
 * Scrapes a website and returns its content as markdown.
 * @param url {string} the URL of the website to scrape.
 * @param apiKey {string} the FireCrawl API key.
 * @return {Promise<string>} the scraped content in markdown format.
 */
export async function scrape(url: string, apiKey: string): Promise<string> {
  const app = new FirecrawlApp({ apiKey });
  
  const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse;
  
  if (!scrapeResult.success) {
    throw new Error(`Failed to scrape: ${scrapeResult.error}`);
  }
  
  return scrapeResult.markdown || '';
}

/**
 * Asks Gemini AI a question.
 * @param question {string} the question to ask.
 * @param apiKey {string} the Gemini API key.
 * @return {Promise<string>} the AI's response.
 */
export async function ask(question: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: question,
  });
  return response.text || '';
} 