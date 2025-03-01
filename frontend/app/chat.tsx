import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View, ScrollView, Alert, TextInput, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';

// We need to conditionally import Whisper based on whether we're in development build
let Whisper: any = null;
try {
  if (Platform.OS !== 'web') {
    // This will throw in Expo Go and be caught
    // @ts-ignore
    const WhisperModule = require('whisper.rn');
    Whisper = WhisperModule.Whisper;
  }
} catch (e) {
  console.log('Whisper not available in this environment');
}

// LangChain imports
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { initEnv, getEnv } from '../utils/env';

// UI components
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

// State interfaces
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Mark this file as a non-tab screen
export const unstable_settings = {
  isTabScreen: false,
};

export default function ChatScreen() {
  // Get the YouTube URL and other parameters from the route parameters
  const { videoUrl, videoTitle, hasTranscript, transcript } = useLocalSearchParams();
  
  // Format the title with proper fallback
  const title = videoTitle ? (videoTitle as string) : 'Recipe Video';
  const transcriptAvailable = hasTranscript === 'true';
  const videoTranscript = transcript as string;

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [status, setStatus] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const whisperRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Messages state - start with a greeting that references the video
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hello! I'm your cooking assistant for "${title}". I've analyzed the recipe from this video and I'm ready to help you cook it. You can ask me about ingredients, techniques, alternatives, or any other questions about this recipe. Just ${Whisper ? 'press the microphone button and speak' : 'type your question below'}.`
    }
  ]);

  // Initialize environment variables and Whisper
  useEffect(() => {
    const setup = async () => {
      // Initialize environment variables
      await initEnv();
      const envApiKey = getEnv('GOOGLE_API_KEY', '');
      if (envApiKey) {
        setApiKey(envApiKey);
        console.log('Successfully loaded API key from environment');
      } else {
        console.warn('No API key found in environment');
        Alert.alert(
          "API Key Required",
          "Please set your GOOGLE_API_KEY in the .env file.",
          [{ text: "OK" }]
        );
      }

      // Initialize Whisper if available
      if (Whisper) {
        try {
          if (!whisperRef.current) {
            whisperRef.current = new Whisper();
            await whisperRef.current.initialize();
            setIsVoiceSupported(true);
            console.log('Whisper initialized successfully');
            
            // Request audio recording permissions
            await Audio.requestPermissionsAsync();
            
            // Configure audio for recording
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });
          }
        } catch (err) {
          console.error('Failed to initialize Whisper:', err);
          setIsVoiceSupported(false);
        }
      } else {
        setIsVoiceSupported(false);
        console.log('Voice input not available in this environment');
      }
    };
    
    setup();
    
    // Speak a welcome message
    if (transcriptAvailable) {
      const welcomeMessage = `I've analyzed the recipe from ${title}. What would you like to know about it?`;
      speakResponse(welcomeMessage);
    }
    
    // Cleanup function
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Start recording function
  const startRecording = async () => {
    if (!isVoiceSupported) {
      Alert.alert(
        "Voice Input Not Available",
        "Voice input requires a development build. Please use text input instead.",
        [{ text: "OK" }]
      );
      return;
    }
    
    try {
      // Stop any ongoing speech
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
      }
      
      setIsRecording(true);
      setStatus('Listening...');
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      setStatus('');
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Stop recording and process audio
  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    setIsProcessing(true);
    setStatus('Processing your voice...');
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      
      // Transcribe audio with Whisper if available
      if (isVoiceSupported && whisperRef.current) {
        await transcribeAudio(uri);
      } else {
        setIsProcessing(false);
        setStatus('');
        Alert.alert('Error', 'Voice recognition not available');
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsProcessing(false);
      setStatus('');
      Alert.alert('Error', 'Failed to process recording');
    }
  };

  // Transcribe audio with Whisper
  const transcribeAudio = async (audioUri: string) => {
    try {
      setStatus('Transcribing...');
      
      // Check if Whisper is initialized
      if (!whisperRef.current) {
        throw new Error('Whisper is not initialized');
      }
      
      // Use Whisper to transcribe
      const result = await whisperRef.current.transcribe(audioUri);
      
      // Extract text from result
      if (result && result.segments && result.segments.length > 0) {
        const transcription = result.segments.map((segment: { text: string }) => segment.text).join(' ').trim();
        
        if (transcription) {
          // Add user message
          const userMessage = { role: 'user' as const, content: transcription };
          setMessages(prev => [...prev, userMessage]);
          
          // Process with LangChain
          await processWithLangChain(transcription);
        } else {
          setStatus('');
          setIsProcessing(false);
          Alert.alert('No Speech Detected', 'Please try speaking again');
        }
      } else {
        throw new Error('Transcription failed: No segments found');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setStatus('');
      setIsProcessing(false);
      Alert.alert('Transcription Error', 'Failed to transcribe your voice');
    }
  };

  // Handle text input submission
  const handleSubmit = async () => {
    if (!textInput.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user' as const, content: textInput.trim() };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setTextInput('');
    
    // Process with LangChain
    await processWithLangChain(userMessage.content);
  };

  // Process with LangChain and Gemini
  const processWithLangChain = async (userInput: string) => {
    try {
      setIsProcessing(true);
      setStatus('Thinking...');
      
      if (!apiKey) {
        throw new Error('Google API key is not configured');
      }
      
      // Initialize the Gemini model
      const model = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        modelName: "gemini-2.0-flash-lite", 
      });
      
      // Create conversation history for context
      const historyMessages = messages.map(msg => {
        return [msg.role === 'user' ? 'human' : 'assistant', msg.content];
      });
      
      // Add system prompt with transcript context
      const systemPrompt = `You are a helpful cooking assistant specializing in recipes shown in YouTube videos.
      The user has just watched a cooking video with the title: "${title}".
      
      Here is the transcript of the video:
      ${videoTranscript ? videoTranscript.substring(0, 8000) : "No transcript available"}
      
      Based on this video's content:
      1. Answer questions about ingredients, measurements, techniques, and cooking times from the video.
      2. Provide alternatives to ingredients if asked.
      3. Explain cooking techniques mentioned in the video.
      4. Keep your responses conversational and concise for voice interaction (under 200 words).
      
      If the user asks about something not in the video, let them know but still try to be helpful.`;
      
      // Add the current query
      const response = await model.invoke([
        ["system", systemPrompt],
        ...historyMessages,
        ["human", userInput]
      ]);
      
      // Extract response text
      const responseText = typeof response.content === 'string' 
        ? response.content 
        : Array.isArray(response.content) 
          ? JSON.stringify(response.content)
          : 'I had trouble understanding that. Could you rephrase your question?';
      
      // Add the assistant's response to messages
      const assistantMessage = { role: 'assistant' as const, content: responseText };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response aloud
      await speakResponse(responseText);
      
      setIsProcessing(false);
      setStatus('');
    } catch (err) {
      console.error('LangChain processing error:', err);
      setIsProcessing(false);
      setStatus('');
      
      // Add error message
      const errorMessage = { 
        role: 'assistant' as const, 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Speak the error message
      await speakResponse(errorMessage.content);
    }
  };

  // Text-to-speech function
  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      await Speech.speak(text, {
        language: 'en',
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
        }
      });
    } catch (err) {
      console.error('Failed to speak response:', err);
      setIsSpeaking(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Recipe Assistant' }} />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
          
          {videoUrl ? (
            <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.videoUrl}>
              {videoUrl as string}
            </ThemedText>
          ) : null}
        </ThemedView>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer} 
          contentContainerStyle={styles.chatContent}
        >
          {messages.map((message, index) => (
            <ThemedView 
              key={index} 
              style={[
                styles.messageBubble, 
                message.role === 'user' ? styles.userBubble : styles.assistantBubble
              ]}
            >
              <ThemedText style={styles.messageText}>{message.content}</ThemedText>
            </ThemedView>
          ))}
          
          {(isProcessing || isSpeaking) && (
            <ThemedView style={styles.statusContainer}>
              <ActivityIndicator color="#FF6B6B" size="small" />
              <ThemedText style={styles.statusText}>
                {isSpeaking ? 'Speaking...' : status}
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
        
        <ThemedView style={styles.footer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about the recipe..."
              placeholderTextColor="#999"
              value={textInput}
              onChangeText={setTextInput}
              multiline={true}
              numberOfLines={1}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={!isProcessing && !isSpeaking && !isRecording}
            />
            
            {/* Text input send button */}
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                { opacity: pressed || isProcessing || isSpeaking || isRecording || !textInput.trim() ? 0.7 : 1 }
              ]}
              onPress={handleSubmit}
              disabled={isProcessing || isSpeaking || isRecording || !textInput.trim()}
            >
              <IconSymbol
                size={20}
                color="white"
                name="arrow.up.circle.fill"
              />
            </Pressable>
            
            {/* Voice input button */}
            <Pressable
              style={({ pressed }) => [
                styles.micButton,
                { backgroundColor: isRecording ? '#FF5252' : '#FF6B6B' },
                { opacity: pressed || isProcessing || isSpeaking ? 0.7 : 1 }
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing || isSpeaking}
            >
              <IconSymbol
                size={24}
                color="white"
                name={isRecording ? "stop.fill" : "mic.fill"}
              />
            </Pressable>
          </View>
          
          <ThemedText style={styles.micHint}>
            {isRecording 
              ? 'Release to send' 
              : isProcessing 
                ? 'Processing...' 
                : isSpeaking 
                  ? 'Speaking...'
                  : isVoiceSupported
                    ? 'Tap and hold mic to speak'
                    : 'Voice input requires a development build'}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  videoUrl: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 30,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#E5F3FF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8BBACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  micHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
}); 