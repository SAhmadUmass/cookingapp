import { Image, StyleSheet, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const handleGetStarted = () => {
    // Navigate to our new YouTube input screen
    router.push('/(tabs)/youtube-input');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to CookingApp!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText>
          Your personal AI cooking assistant that helps you learn new recipes from YouTube videos.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">How it works:</ThemedText>
        <ThemedText>
          1. Paste a YouTube cooking video link
        </ThemedText>
        <ThemedText>
          2. Our AI will transcribe and analyze the video
        </ThemedText>
        <ThemedText>
          3. Chat with our AI to learn more about the recipe
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.buttonContainer}>
        <Pressable 
          style={({pressed}) => [
            styles.button,
            {opacity: pressed ? 0.8 : 1}
          ]}
          onPress={handleGetStarted}>
          <ThemedText style={styles.buttonText}>Get Started</ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#1D3D47',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
