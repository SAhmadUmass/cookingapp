// Declaration file for module types

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

// For LangChain modules
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