# LangChain Integration Setup

This document provides instructions for setting up LangChain with Gemini to process YouTube videos in the CookingApp.

## Required Packages

Install the following packages using Expo's package manager to ensure compatibility:

```bash
# Core LangChain for Gemini integration
npx expo install @langchain/google-genai @google/generative-ai

# YouTube transcript extraction (not using LangChain's loader)
npx expo install youtube-transcript

# Environment variables
npx expo install react-native-dotenv
```

## API Key Setup

### Option 1: Using Environment Variables

1. Get a Google AI API key from: https://makersuite.google.com/app/apikey

2. For Expo development, you can use environment variables with `react-native-dotenv`:

   a. Add this to your `babel.config.js`:
   ```javascript
   module.exports = function(api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       plugins: [
         ["module:react-native-dotenv", {
           "moduleName": "@env",
           "path": ".env",
           "blacklist": null,
           "whitelist": null,
           "safe": false,
           "allowUndefined": true
         }]
       ]
     };
   };
   ```

   b. Create a `.env` file in your project root:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

### Option 2: Manual API Key Input

If the environment variables setup doesn't work, the app now includes a fallback method:

1. Get a Google AI API key from: https://makersuite.google.com/app/apikey
2. When you run the app, you'll see an additional field to enter your API key manually
3. Your API key will be stored only in the app's memory and not persisted between sessions

## Type Declarations

To handle TypeScript module resolution, we've created a `types.d.ts` file with declarations for the external modules:

```typescript
// For @env - environment variables
declare module '@env' {
  export const GOOGLE_API_KEY: string;
  export const LANGUAGE: string;
  export const DEBUG: string;
}

// For youtube-transcript
declare module 'youtube-transcript' {
  export interface TranscriptSegment {
    text: string;
    duration: number;
    offset: number;
  }
  
  export class YoutubeTranscript {
    static fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
  }
}

// For Google Generative AI modules
declare module '@langchain/google-genai' {
  export class ChatGoogleGenerativeAI {
    constructor(options: any);
    invoke(messages: any[]): Promise<{
      content: string | any[];
    }>;
  }
}

declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: any): any;
  }
}
```

## Testing Your Setup

To verify that your LangChain and Gemini integration is working correctly:

1. Run the included test file using Node.js:
   ```bash
   node test-langchain.js
   ```

2. The test will attempt to:
   - Connect to the Gemini API and request a simple response
   - Extract a transcript from a test YouTube video
   - If successful, you'll see the API response and transcript segments
   - If there's an error, you'll receive troubleshooting tips

## Expo Development Server

After installing the packages, restart your Expo development server with cache clearing:

```bash
npx expo start --clear
```

## Troubleshooting

If you encounter issues:

- Make sure all packages are correctly installed
- Verify that the Google API key is valid and has access to the Gemini API
- Check that the YouTube video has captions available
- For non-English videos, you may need to modify the transcript extraction logic
- If you experience build errors, try running: `npx expo install --fix` followed by `npx expo start --clear`
- If you have issues with @env, use the manual API key input option instead 