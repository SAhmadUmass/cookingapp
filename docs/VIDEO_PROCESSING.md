# Video Processing Guide

## Overview
The purpose of this component is to extract useful information from cooking videos that users submit via a URL (e.g. YouTube or TikTok). This process involves video ingestion, metadata extraction, and transcript parsing. The processed data is then used to extract recipes and guide the user through the cooking process.

## Video Ingestion and Preprocessing

1. **Video URL Submission**
   - Users paste a video URL into the app. The URL is validated to ensure it comes from a supported platform (e.g. YouTube or TikTok).

2. **Metadata Extraction**
   - For supported platforms, the system uses appropriate APIs (e.g. YouTube API) or web scraping to retrieve metadata such as title, description, and available captions.
   - A fallback method using tools like yt-dlp can be considered for extracting video data if native APIs are inadequate.

3. **Transcript Extraction**
   - The audio of the video is processed to generate a transcript. This can be achieved using transcription services (such as Whisper) or via platform-supplied captions.
   - The quality of transcription is crucial for the subsequent recipe extraction steps.

## Video Analysis using Gemini

In our envisioned architecture, we plan to leverage advanced multimodal models such as Gemini to parse through the video content. Gemini is designed to understand both visual and auditory inputs.

### How Gemini Can Help:

- **Multimodal Parsing**: Gemini can analyze video frames alongside the audio transcript to identify ingredients being used, cooking actions, and visual cues (e.g., chopping, stirring).
- **Contextual Understanding**: By integrating visual data with the transcript, Gemini can resolve ambiguities in the audio and provide a richer, more accurate context for recipe extraction.
- **Enhanced Recipe Details**: Beyond simple transcription, Gemini can help to infer additional details such as portion sizes, cooking duration, and even suggest substitutions based on visible ingredients.

### Integration Approach:

1. **Preprocessing**
   - The video is split into segments (both in time and frames) to serve as input for Gemini.
   - Transcripts are aligned with corresponding video frames for better context.

2. **Model Inference**
   - Gemini processes the segmented video and audio together to extract structured data.
   - The output is a rich set of metadata including identified ingredients, cooking tools, and step-by-step actions.

3. **Postprocessing**
   - The model output is parsed to generate a standardized JSON that includes the recipe title, list of ingredients, steps, and estimated cooking/preparation times.
   - This structured output is then passed to the LangChain pipeline for further refinement and to integrate it into the conversational cooking assistant.

## Architecture Diagram

```mermaid
graph TD
    A[User submits Video URL] --> B[Video Ingestion Module]
    B --> C[Metadata Extraction (APIs / Scraping)]
    C --> D[Transcript Generation (Whisper/ Captions)]
    D --> E[Gemini Video Analysis]
    E --> F[Structured Recipe Output]
    F --> G[LangChain Recipe Extraction & Voice Agent]
```

## Technical Considerations

- **API Rate Limits and Legal Concerns**: Ensure adherence to platform guidelines for which APIs (or scraping methods) are used to extract video metadata.
- **Processing Latency**: Preprocessing and segmentation for Gemini must be optimized to maintain responsiveness.
- **Fallback Mechanisms**: In the event that Gemini or similar multimodal processing is not available, the system should fallback to using simpler audio transcript-based methods.

## Future Enhancements

- **Real-Time Video Processing**: Explore possibilities for real-time analysis to provide immediate feedback as users play videos.
- **User Feedback Loop**: Incorporate mechanisms where users can correct inaccuracies in the extracted recipe, thus improving model training over time.
- **Integration with Other Multimodal Models**: Evaluate and benchmark Gemini against other available models to ensure the best performance.

## Conclusion

The video processing pipeline is a core component of the Cooking Assistant App. By leveraging advanced models like Gemini, we aim to provide users with highly accurate and context-rich recipe extractions, thereby improving the overall user experience of turning cooking videos into interactive cooking sessions. 