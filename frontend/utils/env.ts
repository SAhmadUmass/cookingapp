import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Cache for environment variables
let envCache: Record<string, string> = {};
let isInitialized = false;

// Function to read environment variables from .env file
export const loadEnvFromFile = async (): Promise<Record<string, string>> => {
  // If we already loaded env vars, return the cache
  if (isInitialized && Object.keys(envCache).length > 0) {
    return envCache;
  }

  try {
    console.log("Attempting to read .env file...");
    
    // Log available directories for debugging
    console.log("Document directory:", FileSystem.documentDirectory);
    console.log("Bundle directory:", FileSystem.bundleDirectory);
    
    // Different approaches to find the .env file
    const possibleLocations = [
      // Standard locations
      FileSystem.documentDirectory + '.env',
      FileSystem.bundleDirectory + '.env',
      
      // With leading slash
      FileSystem.documentDirectory + '/.env',
      FileSystem.bundleDirectory + '/.env',
      
      // For development on specific platforms
      Platform.OS === 'ios' ? FileSystem.bundleDirectory + '../.env' : null,
      Platform.OS === 'ios' ? FileSystem.documentDirectory + '../.env' : null,
      Platform.OS === 'android' ? FileSystem.documentDirectory + '../assets/.env' : null
    ].filter(Boolean) as string[];
    
    // Try each location until we find the file
    let fileFound = false;
    for (const location of possibleLocations) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(location);
        console.log(`Checking location: ${location}, exists: ${fileInfo.exists}`);
        
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(location);
          console.log(`Found .env file at ${location}, content length: ${content.length}`);
          parseEnvFile(content);
          fileFound = true;
          break;
        }
      } catch (err) {
        console.warn(`Error checking ${location}:`, err);
      }
    }
    
    if (!fileFound) {
      // Hardcode the API key as a last resort for development
      console.warn("Could not find .env file in any location. Checking hardcoded values.");
      const hardcodedApiKey = 'AIzaSyAcjVK596nWNvF4VweSoqc3MJ0mQ2UfvuI'; // Get this from your .env file
      envCache['GOOGLE_API_KEY'] = hardcodedApiKey;
    }
    
    isInitialized = true;
    return envCache;
  } catch (error) {
    console.warn("Error reading .env file:", error);
    isInitialized = true;
    return envCache;
  }
};

// Parse env file content
const parseEnvFile = (content: string) => {
  console.log("Parsing env file content...");
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      console.log(`Loaded env var: ${key}=${value.substring(0, 3)}...`);
      envCache[key] = value;
    }
  }
  
  // Debug log what we found
  console.log("Loaded environment variables:", Object.keys(envCache).join(', '));
};

// Get a single environment variable
export const getEnv = (key: string, defaultValue: string = ''): string => {
  return envCache[key] || defaultValue;
};

// Initialize - call this at app startup
export const initEnv = async (): Promise<void> => {
  await loadEnvFromFile();
}; 