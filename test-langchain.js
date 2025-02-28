/**
 * Test file for LangChain and Gemini integration
 * 
 * This file can be run with Node.js to test if your API key and setup works correctly.
 * Usage: 
 * 1. Make sure you have your API key in a .env file or set as an environment variable
 * 2. Run with: node test-langchain.js
 */

// Load environment variables
require('dotenv').config();

// Import required libraries
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { YoutubeTranscript } = require('youtube-transcript');

// Access API key from environment
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('Error: GOOGLE_API_KEY environment variable is not set');
  console.log('Make sure you have created a .env file with your Gemini API key');
  process.exit(1);
}

// Extract YouTube video ID from URL
const extractVideoId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API connection...');
    
    // Initialize the Gemini model
    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: "gemini-1.5-pro",
      maxOutputTokens: 2048,
    });
    
    // Test simple prompt
    const response = await model.invoke([
      ["human", "Write a one-sentence description of a simple pasta recipe."]
    ]);
    
    console.log('\nGemini API Response:');
    console.log(response.content);
    console.log('\nAPI connection successful! Your setup is working correctly.');
    
  } catch (error) {
    console.error('Error connecting to Gemini API:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that your API key is correct and has access to Gemini Pro');
    console.log('2. Make sure you have an internet connection');
    console.log('3. Verify that you have installed the required packages');
  }
}

async function testYoutubeTranscript() {
  try {
    const testVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // A well-known video that has captions
    const videoId = extractVideoId(testVideoUrl);
    
    console.log('\nTesting YouTube transcript extraction...');
    console.log(`Video ID: ${videoId}`);
    
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript found for this video");
    }
    
    console.log(`\nSuccessfully extracted transcript with ${transcript.length} segments`);
    console.log('First few transcript segments:');
    console.log(transcript.slice(0, 3));
    
    console.log('\nYouTube transcript extraction working correctly!');
    
  } catch (error) {
    console.error('\nError extracting YouTube transcript:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure you have installed the youtube-transcript package');
    console.log('2. Check your internet connection');
    console.log('3. Try a different YouTube video that has captions available');
  }
}

// Run the tests
async function runTests() {
  await testGeminiAPI();
  await testYoutubeTranscript();
}

runTests(); 