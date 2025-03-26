# MCP Documentation Assistant

A Cloudflare Worker that combines web scraping and AI to provide intelligent answers about documentation and web content. Built using the Workers MCP framework, FireCrawl SDK, and Google's Gemini AI.

## Features

- 🔍 **Smart Content Scraping**: Automatically detects and scrapes documentation pages and related content
- 🤖 **AI-Powered Answers**: Uses Gemini AI to provide accurate, contextual responses
- 📚 **Multi-Page Context**: Intelligently gathers information from related documentation pages
- 💾 **Caching**: Implements KV storage to cache responses and reduce API calls
- 🎯 **Citation Support**: Provides answers with specific citations to source content
- ⚡ **Performance Optimized**: Uses Cloudflare's edge network for fast response times

## Prerequisites

- Node.js and npm installed
- Cloudflare Workers account
- FireCrawl API key
- Google Gemini API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ts-cag-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.dev.vars` file with:
```
SHARED_SECRET=your-secret
FIRE_CRAWL_API_KEY=your-firecrawl-api-key
GEMINI_API_KEY=your-gemini-api-key
```

4. Set up KV namespace:
```bash
npx wrangler kv namespace create CONTENT_CACHE
```

Add the KV namespace to your `wrangler.jsonc`:
```jsonc
{
  // ... other config ...
  "kv_namespaces": [
    {
      "binding": "CONTENT_CACHE",
      "id": "your-namespace-id"
    }
  ]
}
```

## Usage

### Development

Run the worker locally:
```bash
npm run dev
```

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

### API Endpoints

The worker exposes a single endpoint through the MCP framework:

#### askAboutUrl
```typescript
async askAboutUrl(url: string, question: string): Promise<string>
```

- **Parameters**:
  - `url`: The webpage URL to analyze
  - `question`: The question to ask about the content
- **Returns**: AI-generated answer with citations

### Example

```typescript
const worker = new MyWorker();
const answer = await worker.askAboutUrl(
  'https://docs.example.com/api',
  'What are the authentication methods?'
);
```

## Features in Detail

### Smart Content Detection
- Automatically identifies documentation sites
- Detects complex queries that need more context
- Filters and follows relevant documentation links

### AI Response Format
- Structured answers with clear sections
- Citations in [square brackets]
- Explicit handling of contradictory information
- Relevance-based information ordering

### Error Handling
- Graceful fallbacks for scraping issues
- User-friendly error messages
- Automatic retry suggestions
- Rate limit handling

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 