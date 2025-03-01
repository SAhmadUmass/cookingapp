/**
 * Override the React Native useColorScheme hook to always return 'light'
 */

// Instead of re-exporting from react-native, we're defining our own
export function useColorScheme() {
  // Always return 'light' regardless of system settings
  return 'light';
}
