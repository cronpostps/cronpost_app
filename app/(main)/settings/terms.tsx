// app/(main)/settings/terms.tsx
// Version: 1.0.0

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

const TermsScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const tabBarHeight = useBottomTabBarHeight();
  
  const contentHtml = t('terms_page.content');

  const htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: ${themeColors.background};
          color: ${themeColors.text};
          padding: 15px;
          padding-bottom: ${tabBarHeight + 15}px;
          line-height: 1.6;
          text-align: justify;
        }
        h2 {
          font-size: 1.5em;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          color: ${themeColors.tint};
        }
        h3 {
            font-size: 1.2em;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
        }
        a {
          color: ${themeColors.tint};
          text-decoration: none;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlDoc }}
        style={{ backgroundColor: themeColors.background }}
      />
    </SafeAreaView>
  );
};

export default TermsScreen;
