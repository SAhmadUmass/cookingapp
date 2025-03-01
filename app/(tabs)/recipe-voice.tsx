import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View, ScrollView, Alert, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Stack } from 'expo-router';

// LangChain imports
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { initEnv, getEnv } from '../../utils/env';

// UI components
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ParallaxScrollView from '@/components/ParallaxScrollView';

// State interfaces
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function RecipeVoiceScreen() {
  // Text input state
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your cooking assistant. Ask me anything about recipes, cooking techniques, or ingredients!' 
    }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize environment variables
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
          "Please set your GOOGLE_API_KEY in the .env file or enter it manually.",
          [{ text: "OK" }]
        );
      }
    };
    
    setup();
    
    // Cleanup function
    return () => {
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
      
      // Add system prompt to guide the model's behavior
      const systemPrompt = `You are a helpful cooking assistant that specializes in recipes, cooking techniques, and food information. 
      Keep your responses concise and focused on cooking-related information. 
      If asked about non-cooking topics, gently redirect the conversation back to cooking.
      Keep responses brief (under 200 words).`;
      
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
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FFE8D6', dark: '#2D3748' }}
        headerImage={
          <View style={styles.headerImageContainer}>
            <IconSymbol
              size={80}
              color="#FF6B6B"
              name="mic.fill"
              style={styles.micIcon}
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
            Recipe Assistant
          </ThemedText>
          
          <ThemedText style={styles.description}>
            Ask cooking questions and get spoken responses
          </ThemedText>
          
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
                placeholder="Ask a cooking question..."
                placeholderTextColor="#999"
                value={textInput}
                onChangeText={setTextInput}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                editable={!isProcessing && !isSpeaking}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  { opacity: pressed || isProcessing || isSpeaking ? 0.7 : 1 }
                ]}
                onPress={handleSubmit}
                disabled={isProcessing || isSpeaking || !textInput.trim()}
              >
                <IconSymbol
                  size={20}
                  color="white"
                  name="arrow.up.circle.fill"
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.speakButton,
                  { opacity: pressed || isProcessing || isSpeaking ? 0.7 : 1 }
                ]}
                onPress={() => {
                  Alert.alert(
                    "Voice Input",
                    "Voice input requires a development build of the app. In Expo Go, please use text input instead.",
                    [{ text: "OK" }]
                  );
                }}
                disabled={isProcessing || isSpeaking}
              >
                <IconSymbol
                  size={20}
                  color="white"
                  name="mic.fill"
                />
              </Pressable>
            </View>
          </ThemedView>
        </ThemedView>
      </ParallaxScrollView>
    </>
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
  micIcon: {
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
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 16,
    maxWidth: '80%',
  },
  chatContainer: {
    width: '100%',
    flex: 1,
    marginBottom: 16,
  },
  chatContent: {
    paddingVertical: 16,
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
    width: '100%',
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
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
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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