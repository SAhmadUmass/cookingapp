# Voice Integration Guide

## Overview
This document provides detailed guidance on implementing the voice interaction capabilities of the Cooking Assistant App. Voice interaction is a core feature that enables hands-free cooking by allowing users to communicate with the app through speech while their hands are occupied with cooking tasks.

## Key Components

### 1. Speech Recognition (Speech-to-Text)
Converts user's spoken words into text that can be processed by the application.

### 2. Text-to-Speech
Converts the application's text responses into spoken words for the user.

### 3. Voice Command Detection
Identifies specific commands and intents from the user's speech.

### 4. Voice Session Management
Maintains the state and context of the voice interaction throughout the cooking process.

## Technical Implementation

### Speech Recognition Implementation

#### Using Expo Speech
```typescript
// src/services/speech-recognition.ts
import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { useState, useEffect } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [speechResult, setSpeechResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize voice recognition
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);

    return () => {
      // Cleanup
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      setSpeechResult(e.value[0]);
    }
  };

  const onSpeechError = (e: any) => {
    setError(e.error?.message || 'Unknown error');
    setIsListening(false);
  };

  const startListening = async () => {
    try {
      setError(null);
      setSpeechResult('');
      await Voice.start('en-US');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return {
    isListening,
    speechResult,
    error,
    startListening,
    stopListening,
  };
};
```

#### Continuous Listening Mode
For a more natural cooking experience, implement continuous listening:

```typescript
// src/services/continuous-listening.ts
import { useSpeechRecognition } from './speech-recognition';
import { useEffect, useRef, useState } from 'react';

export const useContinuousListening = (
  onSpeechDetected: (text: string) => void,
  options = { pauseAfterResponse: 2000, silenceThreshold: 1500 }
) => {
  const { 
    startListening, 
    stopListening, 
    isListening, 
    speechResult, 
    error 
  } = useSpeechRecognition();
  
  const [isPaused, setIsPaused] = useState(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const pauseTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Process speech when detected
  useEffect(() => {
    if (speechResult && !isPaused) {
      // Clear any existing silence timer
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
      
      // Process the speech
      onSpeechDetected(speechResult);
      
      // Pause listening briefly after processing a command
      setIsPaused(true);
      stopListening();
      
      // Resume listening after pause
      pauseTimer.current = setTimeout(() => {
        setIsPaused(false);
        startListening();
      }, options.pauseAfterResponse);
    }
  }, [speechResult]);
  
  // Start continuous listening
  const startContinuousListening = async () => {
    setIsPaused(false);
    await startListening();
    
    // Set up silence detection
    silenceTimer.current = setTimeout(() => {
      // Restart listening if silence is detected for too long
      if (isListening) {
        stopListening().then(startListening);
      }
    }, options.silenceThreshold);
  };
  
  // Stop continuous listening
  const stopContinuousListening = async () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
    }
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current);
    }
    setIsPaused(false);
    await stopListening();
  };
  
  return {
    startContinuousListening,
    stopContinuousListening,
    isListening: isListening && !isPaused,
    error,
  };
};
```

### Text-to-Speech Implementation

```typescript
// src/services/text-to-speech.ts
import * as Speech from 'expo-speech';

export class TextToSpeechService {
  private isSpeaking: boolean = false;
  private queue: string[] = [];
  private options: Speech.SpeechOptions;
  
  constructor(options: Speech.SpeechOptions = {}) {
    this.options = {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9, // Slightly slower for clarity
      ...options,
    };
  }
  
  async speak(text: string, priority: boolean = false): Promise<void> {
    if (priority) {
      // Stop any current speech and speak this immediately
      await this.stop();
      this.isSpeaking = true;
      
      return new Promise((resolve) => {
        Speech.speak(text, {
          ...this.options,
          onDone: () => {
            this.isSpeaking = false;
            this.processQueue();
            resolve();
          },
        });
      });
    } else {
      // Add to queue
      this.queue.push(text);
      
      // Process queue if not speaking
      if (!this.isSpeaking) {
        this.processQueue();
      }
    }
  }
  
  async stop(): Promise<void> {
    await Speech.stop();
    this.isSpeaking = false;
  }
  
  clearQueue(): void {
    this.queue = [];
  }
  
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }
    
    const nextText = this.queue.shift();
    if (nextText) {
      this.isSpeaking = true;
      
      return new Promise((resolve) => {
        Speech.speak(nextText, {
          ...this.options,
          onDone: () => {
            this.isSpeaking = false;
            this.processQueue();
            resolve();
          },
        });
      });
    }
  }
  
  // Customize voice for different types of content
  speakStep(step: string): Promise<void> {
    return this.speak(step, true);
  }
  
  speakIngredient(ingredient: string): Promise<void> {
    return this.speak(ingredient);
  }
  
  speakAlert(alert: string): Promise<void> {
    return this.speak(alert, true);
  }
  
  // Check if TTS is available
  static async isAvailable(): Promise<boolean> {
    return true; // Expo Speech is always available
  }
}

// Create a singleton instance
export const ttsService = new TextToSpeechService();
```

### Voice Command Detection

```typescript
// src/services/command-detection.ts
import { RecipeService } from './recipe-service';

// Define command types
export enum CommandType {
  NEXT_STEP = 'next_step',
  PREVIOUS_STEP = 'previous_step',
  REPEAT = 'repeat',
  INGREDIENTS = 'ingredients',
  TIMER = 'timer',
  HELP = 'help',
  GENERAL_QUESTION = 'general_question',
}

// Command detection service
export class CommandDetectionService {
  private commandPatterns: Record<CommandType, RegExp[]> = {
    [CommandType.NEXT_STEP]: [
      /next step/i,
      /continue/i,
      /what('s| is) next/i,
      /move (on|forward)/i,
    ],
    [CommandType.PREVIOUS_STEP]: [
      /previous step/i,
      /go back/i,
      /repeat (the |that |this )?(last |previous )?step/i,
    ],
    [CommandType.REPEAT]: [
      /repeat (that|this|again)/i,
      /say (that|this|it) again/i,
      /what did you say/i,
    ],
    [CommandType.INGREDIENTS]: [
      /what (are|were) the ingredients/i,
      /list (the )?ingredients/i,
      /what do I need/i,
    ],
    [CommandType.TIMER]: [
      /set (a )?timer for (\d+)/i,
      /timer (\d+)/i,
      /remind me in (\d+)/i,
    ],
    [CommandType.HELP]: [
      /help/i,
      /what can (I|you) do/i,
      /what commands/i,
    ],
    [CommandType.GENERAL_QUESTION]: [
      /how (do|can|should) I/i,
      /what (is|are)/i,
      /why (is|are|should)/i,
    ],
  };
  
  detectCommand(text: string): { type: CommandType; params?: any } | null {
    // Check each command pattern
    for (const [type, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          // Extract parameters if needed
          let params = null;
          if (type === CommandType.TIMER && match[2]) {
            params = { minutes: parseInt(match[2], 10) };
          }
          
          return { 
            type: type as CommandType, 
            params 
          };
        }
      }
    }
    
    // If no specific command is detected, treat as a general question
    return { type: CommandType.GENERAL_QUESTION };
  }
  
  async handleCommand(
    command: { type: CommandType; params?: any },
    sessionId: string,
    text: string
  ): Promise<string> {
    const recipeService = RecipeService.getInstance();
    
    switch (command.type) {
      case CommandType.NEXT_STEP:
        const nextStep = await recipeService.advanceToNextStep(sessionId);
        return `Moving to the next step. ${nextStep}`;
        
      case CommandType.PREVIOUS_STEP:
        const prevStep = await recipeService.goToPreviousStep(sessionId);
        return `Going back to the previous step. ${prevStep}`;
        
      case CommandType.REPEAT:
        const currentStep = recipeService.getCurrentStep(sessionId);
        return `I'll repeat that. ${currentStep}`;
        
      case CommandType.INGREDIENTS:
        const ingredients = await recipeService.getIngredients(sessionId);
        return `Here are the ingredients you need: ${ingredients}`;
        
      case CommandType.TIMER:
        const minutes = command.params?.minutes || 5;
        // In a real implementation, this would set an actual timer
        return `Setting a timer for ${minutes} minutes.`;
        
      case CommandType.HELP:
        return `
          Here are some commands you can use:
          - "Next step" to move to the next step
          - "Go back" to return to the previous step
          - "Repeat that" to hear the current step again
          - "What are the ingredients" to hear the ingredient list
          - "Set a timer for X minutes" to set a timer
          - You can also ask me any questions about the recipe
        `;
        
      case CommandType.GENERAL_QUESTION:
      default:
        // Process general questions through LLM
        return await recipeService.handleUserInput(sessionId, text);
    }
  }
}

export const commandDetection = new CommandDetectionService();
```

### Voice Session Management

```typescript
// src/services/voice-session.ts
import { useContinuousListening } from './continuous-listening';
import { ttsService } from './text-to-speech';
import { commandDetection, CommandType } from './command-detection';
import { RecipeService } from './recipe-service';
import { useState, useEffect } from 'react';

export const useVoiceSession = (sessionId: string) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  
  const recipeService = RecipeService.getInstance();
  
  // Initialize session data
  useEffect(() => {
    if (sessionId) {
      const progress = recipeService.getSessionProgress(sessionId);
      setCurrentStep(progress.currentStep);
      setTotalSteps(progress.totalSteps);
      
      // Announce the recipe when session starts
      const recipe = recipeService.getRecipe(sessionId);
      ttsService.speak(`Ready to cook ${recipe.title}. Say "start" when you're ready to begin, or "ingredients" to hear what you'll need.`);
    }
  }, [sessionId]);
  
  // Handle speech input
  const handleSpeechInput = async (text: string) => {
    if (!text || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Detect command from speech
      const command = commandDetection.detectCommand(text);
      
      // Process the command
      const response = await commandDetection.handleCommand(command, sessionId, text);
      
      // Update UI state if needed
      if (command.type === CommandType.NEXT_STEP || command.type === CommandType.PREVIOUS_STEP) {
        const progress = recipeService.getSessionProgress(sessionId);
        setCurrentStep(progress.currentStep);
      }
      
      // Speak the response
      await ttsService.speak(response);
      setLastResponse(response);
    } catch (error) {
      console.error('Error processing voice command:', error);
      ttsService.speak('Sorry, I had trouble processing that request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Set up continuous listening
  const { 
    startContinuousListening, 
    stopContinuousListening, 
    isListening, 
    error 
  } = useContinuousListening(handleSpeechInput);
  
  // Start voice session
  const startSession = async () => {
    setIsActive(true);
    await startContinuousListening();
    
    // Announce first step
    const firstStep = recipeService.getCurrentStep(sessionId);
    ttsService.speak(`Let's get started. ${firstStep}`);
  };
  
  // Stop voice session
  const stopSession = async () => {
    await stopContinuousListening();
    await ttsService.stop();
    ttsService.clearQueue();
    setIsActive(false);
  };
  
  // Pause/resume voice session
  const togglePause = async () => {
    if (isActive) {
      await stopContinuousListening();
      ttsService.speak('Voice assistant paused. Tap to resume.');
    } else {
      await startContinuousListening();
      ttsService.speak('Voice assistant resumed.');
    }
    setIsActive(!isActive);
  };
  
  return {
    isActive,
    isListening,
    isProcessing,
    currentStep,
    totalSteps,
    lastResponse,
    error,
    startSession,
    stopSession,
    togglePause,
  };
};
```

## Voice UI Components

### Voice Control Panel

```tsx
// src/components/VoiceControlPanel.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceSession } from '../services/voice-session';

interface VoiceControlPanelProps {
  sessionId: string;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({ sessionId }) => {
  const {
    isActive,
    isListening,
    isProcessing,
    startSession,
    stopSession,
    togglePause,
  } = useVoiceSession(sessionId);
  
  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={stopSession}
          disabled={!isActive}
        >
          <Ionicons name="stop-circle" size={24} color={isActive ? "#FF3B30" : "#999"} />
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, isActive && styles.activeButton]}
          onPress={isActive ? togglePause : startSession}
        >
          <Ionicons 
            name={isActive ? (isListening ? "mic" : "mic-off") : "play"} 
            size={32} 
            color="#FFF" 
          />
          <Text style={styles.primaryButtonText}>
            {isActive 
              ? (isListening ? "Listening" : "Paused") 
              : "Start Voice"
            }
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => {/* Manual step navigation */}}
        >
          <Ionicons name="list" size={24} color="#007AFF" />
          <Text style={styles.buttonText}>Steps</Text>
        </TouchableOpacity>
      </View>
      
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    width: 120,
    height: 120,
    borderRadius: 60,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#007AFF',
  },
  primaryButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  processingIndicator: {
    marginTop: 12,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 14,
    color: '#666',
  },
});
```

### Voice Feedback Display

```tsx
// src/components/VoiceFeedbackDisplay.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';

interface VoiceFeedbackDisplayProps {
  isListening: boolean;
  lastResponse: string;
  isProcessing: boolean;
}

export const VoiceFeedbackDisplay: React.FC<VoiceFeedbackDisplayProps> = ({
  isListening,
  lastResponse,
  isProcessing,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);
  
  if (!isListening && !lastResponse && !isProcessing) {
    return null;
  }
  
  return (
    <BlurView intensity={80} style={styles.container}>
      <View style={styles.content}>
        {isListening && (
          <View style={styles.listeningIndicator}>
            <Animated.View 
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}
        
        {isProcessing && (
          <Text style={styles.processingText}>Processing your request...</Text>
        )}
        
        {lastResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Assistant</Text>
            <Text style={styles.responseText}>{lastResponse}</Text>
          </View>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 8,
  },
  responseContainer: {
    marginTop: 8,
  },
  responseTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
});
```

## Best Practices

### 1. Voice Recognition Optimization

- **Keyword Detection**: Implement wake words or key phrases to trigger specific actions
- **Noise Filtering**: Apply noise cancellation techniques for kitchen environments
- **Confirmation Patterns**: Confirm critical actions before executing them
- **Fallback Mechanisms**: Provide visual alternatives when voice recognition fails

### 2. Voice UX Design

- **Clear Feedback**: Always provide feedback when the system is listening, processing, or responding
- **Concise Responses**: Keep voice responses brief and actionable
- **Progressive Disclosure**: Provide basic information first, with details available on request
- **Error Recovery**: Design graceful recovery paths for misunderstood commands

### 3. Performance Considerations

- **Battery Usage**: Optimize continuous listening to minimize battery drain
- **Response Time**: Aim for voice responses within 1-2 seconds
- **Offline Capabilities**: Implement basic command recognition that works offline
- **Background Processing**: Handle voice processing in background threads

### 4. Accessibility

- **Voice Speed Control**: Allow users to adjust the speed of voice responses
- **Voice Selection**: Provide options for different voice types
- **Visual Alternatives**: Always provide visual feedback alongside voice
- **Transcripts**: Show transcripts of voice interactions for review

## Testing Voice Integration

```typescript
// src/tests/voice-recognition.test.ts
import { CommandDetectionService, CommandType } from '../services/command-detection';

describe('Command Detection', () => {
  const commandDetection = new CommandDetectionService();
  
  test('should detect next step command', () => {
    const result = commandDetection.detectCommand('next step please');
    expect(result?.type).toBe(CommandType.NEXT_STEP);
  });
  
  test('should detect previous step command', () => {
    const result = commandDetection.detectCommand('go back to the previous step');
    expect(result?.type).toBe(CommandType.PREVIOUS_STEP);
  });
  
  test('should detect timer command with parameters', () => {
    const result = commandDetection.detectCommand('set a timer for 10 minutes');
    expect(result?.type).toBe(CommandType.TIMER);
    expect(result?.params?.minutes).toBe(10);
  });
  
  test('should treat unknown commands as general questions', () => {
    const result = commandDetection.detectCommand('what temperature should the oven be?');
    expect(result?.type).toBe(CommandType.GENERAL_QUESTION);
  });
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Poor Voice Recognition**
   - Implement a visual confirmation of recognized text
   - Add a manual correction option
   - Use context to improve recognition accuracy

2. **Background Noise Interference**
   - Implement noise cancellation
   - Add a push-to-talk option for noisy environments
   - Use directional microphones when available

3. **Slow Response Times**
   - Cache common responses
   - Implement local processing for basic commands
   - Optimize network requests

4. **Battery Drain**
   - Implement intelligent listening patterns
   - Add auto-sleep after periods of inactivity
   - Optimize background processing

## Integration with Recipe Flow

### Recipe Step Navigation

```typescript
// src/screens/CookingScreen.tsx (partial)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RecipeStep } from '../components/RecipeStep';
import { VoiceControlPanel } from '../components/VoiceControlPanel';
import { VoiceFeedbackDisplay } from '../components/VoiceFeedbackDisplay';
import { useVoiceSession } from '../services/voice-session';
import { RecipeService } from '../services/recipe-service';

export const CookingScreen: React.FC<{ route: { params: { sessionId: string } } }> = ({ 
  route 
}) => {
  const { sessionId } = route.params;
  const {
    isActive,
    isListening,
    isProcessing,
    currentStep,
    totalSteps,
    lastResponse,
    startSession,
    stopSession,
    togglePause,
  } = useVoiceSession(sessionId);
  
  const recipeService = RecipeService.getInstance();
  const recipe = recipeService.getRecipe(sessionId);
  const step = recipe.steps[currentStep - 1];
  
  return (
    <View style={styles.container}>
      <RecipeStep 
        step={step} 
        stepNumber={currentStep} 
        totalSteps={totalSteps} 
      />
      
      <VoiceControlPanel 
        sessionId={sessionId} 
      />
      
      <VoiceFeedbackDisplay 
        isListening={isListening}
        lastResponse={lastResponse}
        isProcessing={isProcessing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
});
```

## Resources

- [Expo Speech Documentation](https://docs.expo.dev/versions/latest/sdk/speech/)
- [React Native Voice](https://github.com/react-native-voice/voice)
- [Voice User Interface Design Guide](https://www.nngroup.com/articles/voice-first/)
- [Accessibility Guidelines for Voice Interfaces](https://www.w3.org/WAI/standards-guidelines/) 