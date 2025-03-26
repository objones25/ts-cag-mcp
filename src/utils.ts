import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { GoogleGenAI } from "@google/genai";

/**
 * Formats a prompt for asking questions about content
 */
export function formatContentQuery(content: string, question: string): string {
  return `You are a helpful AI assistant that provides accurate, concise answers based on the given content. 
Your task is to answer questions using ONLY the information provided in the content below.
If the answer cannot be found in the content, say so clearly.
Always cite specific parts of the content to support your answers.

Content:
${content}

Question: ${question}

Answer: `;
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