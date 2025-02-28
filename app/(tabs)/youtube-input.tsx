import React, { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, Keyboard, View, Image, Alert } from 'react-native';
import { router } from 'expo-router';

// Updated LangChain and Gemini imports
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Import from our config file instead of using @env
import Config from '@/config';

// Initialize API key from config
let GOOGLE_API_KEY = Config.GOOGLE_API_KEY || '';

// Log API key status for debugging
console.log('API Key present:', GOOGLE_API_KEY ? 'YES' : 'NO');

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Define types for our data
interface VideoInfo {
  title?: string;
  [key: string]: any;
}

interface ProcessResult {
  success: boolean;
  videoInfo?: VideoInfo;
  transcript?: string;
  isCookingVideo?: boolean;
  error?: string;
}

export default function YouTubeInputScreen() {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [manualApiKey, setManualApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!GOOGLE_API_KEY);

  // Use either the environment API key or the manually entered one
  const getApiKey = () => manualApiKey || GOOGLE_API_KEY || '';

  const handlePaste = async () => {
    // For now just show a placeholder message since we don't have expo-clipboard
    setError('Paste functionality would be implemented here');
    
    // In a real app with expo-clipboard, we would do:
    // const clipboardContent = await Clipboard.getStringAsync();
    // if (clipboardContent) {
    //   setYoutubeLink(clipboardContent.trim());
    //   setError('');
    // }
  };

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const processYoutubeWithLangChain = async (url: string): Promise<ProcessResult> => {
    try {
      const apiKey = getApiKey();
      
      if (!apiKey) {
        throw new Error("Please enter a valid Google Gemini API key to process videos");
      }
      
      setProcessingStatus('Loading YouTube transcript...');
      
      // Extract the video ID
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL format");
      }
      
      // Get video info using basic fetch request
      setProcessingStatus('Getting video information...');
      const videoInfoResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const videoInfo = videoInfoResponse.ok ? await videoInfoResponse.json() : { title: "YouTube Video" };
      
      // Get transcript using youtube-transcript package
      setProcessingStatus('Extracting transcript...');
      const transcriptResult = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptResult || transcriptResult.length === 0) {
        throw new Error("Could not extract transcript from this video. It may not have captions available.");
      }
      
      // Convert transcript segments to full text
      const transcript = transcriptResult.map(item => item.text).join(" ");
      
      // Initialize the Gemini model
      setProcessingStatus('Analyzing with Gemini...');
      const model = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        modelName: "gemini-1.5-pro",
        maxOutputTokens: 2048,
      });
      
      // Basic validation to see if the transcript contains cooking-related content
      const response = await model.invoke([
        ["human", `I have a YouTube cooking video transcript. Can you confirm if this contains cooking instructions or a recipe? Just answer Yes or No. Transcript: ${transcript.substring(0, 1000)}...`]
      ]);
      
      // Handle response content safely with type checking
      const responseText = typeof response.content === 'string' 
        ? response.content 
        : Array.isArray(response.content) 
          ? JSON.stringify(response.content)
          : '';
      
      const isCookingVideo = responseText.toLowerCase().includes('yes');
      
      return {
        success: true,
        videoInfo,
        transcript,
        isCookingVideo,
      };
    } catch (error: any) {
      console.error("Error processing YouTube video:", error);
      return {
        success: false,
        error: error.message || "Failed to process video",
      };
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!youtubeLink) {
      setError('Please enter a YouTube link');
      return;
    }

    // Check if it's a valid YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    if (!youtubeRegex.test(youtubeLink)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    // Check if API key is available
    if (!getApiKey()) {
      setError('Please enter your Google Gemini API key');
      setShowApiKeyInput(true);
      return;
    }

    setError('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Process the YouTube link with LangChain
      const result = await processYoutubeWithLangChain(youtubeLink);
      
      if (!result.success) {
        setError(result.error || 'Failed to process video');
        setIsLoading(false);
        return;
      }
      
      if (!result.isCookingVideo) {
        // Show an alert but still allow them to continue
        Alert.alert(
          "Not a cooking video?",
          "This might not be a cooking video. Do you want to continue anyway?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setIsLoading(false)
            },
            {
              text: "Continue",
              onPress: () => {
                // Navigate to chat screen with the processed data
                router.push({
                  pathname: '/chat',
                  params: { 
                    videoUrl: youtubeLink,
                    videoTitle: result.videoInfo?.title || 'YouTube Video',
                    hasTranscript: 'true'
                  }
                });
                
                // Reset form
                setYoutubeLink('');
                setIsLoading(false);
              }
            }
          ]
        );
        return;
      }
      
      // If it's a cooking video, continue directly
      router.push({
        pathname: '/chat',
        params: { 
          videoUrl: youtubeLink,
          videoTitle: result.videoInfo?.title || 'Cooking Video',
          hasTranscript: 'true'
        }
      });
      
      // Reset form
      setYoutubeLink('');
      setIsLoading(false);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFE8D6', dark: '#2D3748' }}
      headerImage={
        <View style={styles.headerImageContainer}>
          <IconSymbol
            size={80}
            color="#FF6B6B"
            name="play.circle.fill"
            style={styles.playIcon}
          />
          <IconSymbol
            size={70}
            color="#FFB347"
            name="fork.knife"
            style={styles.utensils}
          />
        </View>
      }>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Add a New Recipe
        </ThemedText>
        
        <ThemedText style={styles.description}>
          Discover amazing dishes by adding YouTube cooking videos
        </ThemedText>
        
        <ThemedView style={styles.card}>
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>YouTube Link</ThemedText>
            <View style={styles.inputWithButton}>
              <TextInput
                style={styles.input}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor="#999"
                value={youtubeLink}
                onChangeText={setYoutubeLink}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.pasteButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={handlePaste}>
                <ThemedText style={styles.pasteButtonText}>Paste</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
          
          {/* API Key manual input if environment variables aren't available */}
          {showApiKeyInput && (
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Google Gemini API Key</ThemedText>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Gemini API key here..."
                  placeholderTextColor="#999"
                  value={manualApiKey}
                  onChangeText={setManualApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={true}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.infoButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => Alert.alert(
                    "API Key",
                    "Get a Gemini API key from https://makersuite.google.com/app/apikey"
                  )}>
                  <IconSymbol size={16} color="white" name="info.circle.fill" />
                </Pressable>
              </View>
              <ThemedText style={styles.apiKeyHint}>
                Your API key will only be stored locally on your device
              </ThemedText>
            </ThemedView>
          )}
          
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          {processingStatus ? <ThemedText style={styles.processingText}>{processingStatus}</ThemedText> : null}
          
          <View style={styles.hintContainer}>
            <IconSymbol size={20} color="#8BBACA" name="lightbulb.fill" />
            <ThemedText style={styles.hint}>
              Try a recipe from your favorite chef or cooking channel
            </ThemedText>
          </View>
        </ThemedView>
        
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed || isLoading ? 0.8 : 1 }
          ]}
          onPress={handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#1D3D47" size="small" />
              {processingStatus ? <ThemedText style={styles.loadingText}>{processingStatus}</ThemedText> : null}
            </View>
          ) : (
            <>
              <ThemedText style={styles.buttonText}>Continue</ThemedText>
              <IconSymbol size={20} color="#1D3D47" name="arrow.right" style={styles.buttonIcon} />
            </>
          )}
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerImageContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    position: 'absolute',
    bottom: 50,
    right: 120,
  },
  utensils: {
    position: 'absolute',
    bottom: 50,
    left: 120,
  },
  title: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
  },
  description: {
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 16,
    maxWidth: '80%',
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pasteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#8BBACA',
    marginLeft: 8,
  },
  infoButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#8BBACA',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  pasteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  apiKeyHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 25,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minWidth: 200,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1D3D47',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 2,
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 16,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  processingText: {
    color: '#8BBACA',
    marginBottom: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#1D3D47',
    marginLeft: 8,
    fontSize: 14,
  },
}); 