import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { GoogleGenAI } from "@google/genai";

/**
 * Formats a prompt for asking questions about content
 */
export function formatContentQuery(content: string, question: string): string {
  return `You are a helpful AI assistant that provides accurate, concise answers based on the given content.
Your task is to answer questions using ONLY the information provided.
If the answer cannot be found in the content, say so clearly.
Always include specific citations in [square brackets] and present the most relevant information first.

Content:
${content}

Question: ${question}

Answer: `;
}

/**
 * Determines if a URL should be included in related page scraping
 */
function isRelevantDocUrl(url: string, baseUrl: string): boolean {
  // Don't include the base URL itself
  if (url === baseUrl) return false;
  
  // Quick check for doc-like paths
  const isDocPage = url.includes('/docs/') || 
                   url.includes('/guide/') || 
                   url.includes('/api/') ||
                   url.includes('/reference/');
                   
  // Quick check for obvious non-doc pages
  const isNotDocPage = url.includes('/issues/') ||
                     url.includes('/pull/') ||
                     url.includes('/blog/');
                     
  return isDocPage && !isNotDocPage;
}

/**
 * Scrapes content with optional related pages when appropriate
 */
export async function scrapeContent(url: string, apiKey: string, isComplex: boolean = false): Promise<string> {
  const app = new FirecrawlApp({ apiKey });
  
  // Always scrape the main URL first
  const mainResult = await app.scrapeUrl(url, { 
    formats: ['markdown', 'links'],
    onlyMainContent: true
  }) as ScrapeResponse;
  
  if (!mainResult.success || !mainResult.markdown) {
    throw new Error(`Failed to scrape: ${mainResult.error || 'Unknown error'}`);
  }
  
  // For simple queries or non-doc sites, return just the main content
  if (!isComplex || !url.match(/docs|documentation|github\.com|api|guide/)) {
    return mainResult.markdown;
  }
  
  // For complex queries on doc sites, try to add related content
  try {
    // Get up to 2 related pages from the links in the main page
    const relatedUrls = (mainResult.links || [])
      .filter(linkedUrl => isRelevantDocUrl(linkedUrl, url))
      .slice(0, 2);
    
    if (relatedUrls.length === 0) {
      return mainResult.markdown;
    }
    
    // Use batch scraping for efficiency
    const batchResult = await app.batchScrapeUrls(relatedUrls, {
      formats: ['markdown'],
      onlyMainContent: true
    });
    
    // Combine all content with source labels
    const allContent = [`## Main Page: ${url}\n\n${mainResult.markdown}`];
    
    if (batchResult.success && batchResult.data) {
      batchResult.data.forEach((result: any) => {
        if (result.success && result.markdown) {
          allContent.push(`## Related Page: ${result.metadata.url}\n\n${result.markdown}`);
        }
      });
    }
    
    return allContent.join('\n\n');
  } catch (error) {
    // If related page scraping fails, just return the main content
    console.error('Error getting related pages:', error);
    return mainResult.markdown;
  }
}

/**
 * Asks Gemini AI a question
 */
export async function ask(question: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: question
  });
  return response.text || '';
} 