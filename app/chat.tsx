import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ChatScreen() {
  // Get the YouTube URL and other parameters from the route parameters
  const { videoUrl, videoTitle, hasTranscript } = useLocalSearchParams();
  
  // Format the title with proper fallback
  const title = videoTitle ? (videoTitle as string) : 'Recipe Video';
  const transcriptAvailable = hasTranscript === 'true';
  
  return (
    <>
      <Stack.Screen options={{ title: 'Recipe Assistant' }} />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
          
          {videoUrl ? (
            <>
              <ThemedText style={styles.subtitle}>Video URL:</ThemedText>
              <ThemedText style={styles.videoUrl}>{videoUrl as string}</ThemedText>
              
              <ThemedView style={styles.processingCard}>
                <ThemedText style={styles.cardTitle}>Processing with LangChain</ThemedText>
                <ThemedText style={styles.cardText}>
                  {transcriptAvailable 
                    ? "✅ Successfully processed the video transcript!" 
                    : "⚠️ Could not process the video transcript"}
                </ThemedText>
                <ThemedText style={styles.cardText}>
                  In a complete implementation, this is where you would:
                </ThemedText>
                <ThemedText style={styles.listItem}>
                  • Chat with an AI about the recipe details
                </ThemedText>
                <ThemedText style={styles.listItem}>
                  • Ask questions about ingredients or cooking steps
                </ThemedText>
                <ThemedText style={styles.listItem}>
                  • Get suggestions for modifications or substitutions
                </ThemedText>
                <ThemedText style={styles.listItem}>
                  • Use voice commands with Whisper for hands-free interaction
                </ThemedText>
              </ThemedView>
            </>
          ) : (
            <ThemedText style={styles.placeholder}>
              No YouTube URL provided. Please go back and enter a valid URL.
            </ThemedText>
          )}
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoUrl: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  placeholder: {
    textAlign: 'center',
    marginBottom: 16,
  },
  processingCard: {
    backgroundColor: 'rgba(161, 206, 220, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 18,
  },
  cardText: {
    marginBottom: 12,
  },
  listItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
}); 