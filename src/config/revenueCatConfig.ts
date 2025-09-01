// src/config/revenueCatConfig.ts
// Version: 1.0.0

import { Platform } from 'react-native';

const APPLE_API_KEY = 'appl_NGEUzzLuiExskwTxzQbBwYIfxTF';
const GOOGLE_API_KEY = 'goog_MofoRsQUYotLCUvNgaSWaMijZFP';

export const revenueCatConfig = {
  apiKey: Platform.OS === 'ios' ? APPLE_API_KEY : GOOGLE_API_KEY,
  entitlementId: 'Premium',
};