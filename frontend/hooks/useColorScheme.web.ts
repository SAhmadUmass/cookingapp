import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Custom hook that forces light mode regardless of system settings
 * This is the web-specific version
 */
export function useColorScheme() {
  // Always return 'light' regardless of system settings
  return 'light';
}
