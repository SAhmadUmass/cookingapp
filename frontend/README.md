# CookingApp

A React Native mobile application that helps users learn new recipes from YouTube cooking videos using AI technology.

## Features

- **Home Screen**: Welcoming interface that explains the app's functionality
- **YouTube Input**: Clean interface to paste YouTube cooking video links
- **Recipe Chat**: Conversational interface to discuss and learn about recipes

## Technology Stack

- React Native with Expo
- LangChain.js for AI integration
- YouTube transcription capabilities
- Gemini for AI processing
- Whisper for voice interaction

## Planned Implementation Steps

### Phase 1: Basic UI (Completed)
- ✅ Home screen with introduction
- ✅ YouTube link input with validation
- ✅ Basic navigation between screens

### Phase 2: LangChain Integration
- [ ] Install LangChain and related dependencies
- [ ] Implement YouTube transcript extraction using `youtube-transcript` and `youtubei.js`
- [ ] Process video content using LangChain Expression Language (LCEL)
- [ ] Connect to AI model for analysis

```javascript
// Example of planned LangChain implementation
import { YoutubeLoader } from "langchain/document_loaders/web/youtube";

const loader = YoutubeLoader.createFromUrl(youtubeUrl, {
  language: "en",
  addVideoInfo: true,
});

const docs = await loader.load();
// Process with LangChain
```

### Phase 3: Chat Interface
- [ ] Develop interactive chat UI
- [ ] Implement Whisper for voice interaction
- [ ] Create conversational model for recipe Q&A

## Setup and Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the application: `npm start`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
