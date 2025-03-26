import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { GoogleGenAI } from "@google/genai";

/**
 * Formats a prompt for asking questions about content
 */
export function formatContentQuery(content: string, question: string): string {
  return `You are a helpful AI assistant that provides accurate, concise answers based on the given content.
Your task is to answer questions using ONLY the information provided in the content below.
If the answer cannot be found in the content, say so clearly.

Important requirements:
1. Always include specific citations in [square brackets] that reference where in the content you found your information
2. Structure your response with clear sections when appropriate
3. If different parts of the content provide contradictory information, note this explicitly
4. Present the most relevant information first

Content:
${content}

Question: ${question}

Answer: `;
}

/**
 * Scrapes a website and returns its content as markdown.
 */
export async function scrape(url: string, apiKey: string): Promise<string> {
  const app = new FirecrawlApp({ apiKey });
  
  const scrapeResult = await app.scrapeUrl(url, { 
    formats: ['markdown'],
    onlyMainContent: true
  }) as ScrapeResponse;
  
  if (!scrapeResult.success) {
    throw new Error(`Failed to scrape: ${scrapeResult.error}`);
  }
  
  return scrapeResult.markdown || '';
}

/**
 * Discovers and scrapes related pages from a base URL using batch scraping
 */
export async function scrapeWithRelatedPages(baseUrl: string, apiKey: string, maxPages: number = 3): Promise<string> {
  const app = new FirecrawlApp({ apiKey });
  const scrapedUrls = new Set<string>();
  let allContent: string[] = [];
  
  // First scrape the primary URL
  try {
    const mainResult = await app.scrapeUrl(baseUrl, { 
      formats: ['markdown'],
      onlyMainContent: true
    }) as ScrapeResponse;
    
    if (!mainResult.success || !mainResult.markdown) {
      throw new Error(`Failed to scrape main URL: ${mainResult.error || 'Unknown error'}`);
    }

    scrapedUrls.add(baseUrl);
    allContent = [`## Content from: ${baseUrl}\n\n${mainResult.markdown}`];
    
    // For documentation sites, try to find related pages
    if (maxPages > 1 && (
        baseUrl.includes('/docs/') || 
        baseUrl.includes('/documentation/') ||
        baseUrl.includes('github.com/') ||
        baseUrl.includes('api-reference')
    )) {
      // Get links from the main page's content
      const mainLinks = mainResult.links || [];
      const relatedUrls = mainLinks
        .filter((url: string) => !scrapedUrls.has(url))
        .filter((url: string) => {
          // Filter for likely documentation pages
          const isDocPage = url.includes('/docs/') || 
                          url.includes('/guide/') || 
                          url.includes('/tutorial/') ||
                          url.includes('/api/') ||
                          url.endsWith('.md') ||
                          url.includes('/reference/');
                          
          // Exclude obvious non-doc pages
          const isNotDocPage = url.includes('/issues/') ||
                            url.includes('/pull/') ||
                            url.includes('/community/') ||
                            url.includes('/blog/');
                            
          return isDocPage && !isNotDocPage;
        })
        .slice(0, maxPages - 1);

      if (relatedUrls.length > 0) {
        // Use batch scraping for related URLs
        const batchResult = await app.batchScrapeUrls(relatedUrls, {
          formats: ['markdown'],
          onlyMainContent: true
        });

        if (batchResult.success && batchResult.data) {
          // Add successful scrapes to our content
          batchResult.data.forEach((result: any) => {
            if (result.success && result.markdown) {
              allContent.push(`## Content from: ${result.metadata.url}\n\n${result.markdown}`);
              scrapedUrls.add(result.metadata.url);
            }
          });
        }
      }
    }
    
    return allContent.join('\n\n');
  } catch (error) {
    console.error('Error in scrapeWithRelatedPages:', error);
    // If we at least got the main content, return that
    if (scrapedUrls.has(baseUrl)) {
      return allContent[0];
    }
    throw error;
  }
}

/**
 * Asks Gemini AI a question with improved model configuration
 */
export async function ask(question: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: question
  });
  return response.text || '';
} 