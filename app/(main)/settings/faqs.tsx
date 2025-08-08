// app/(main)/settings/faqs.tsx
// Version: 1.0.0

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

const FaqsScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const tabBarHeight = useBottomTabBarHeight();

  // Dynamically build FAQ items from translation file
  let faqsHtml = '';
  let i = 1;
  while (true) {
    const questionKey = `faqs_page.question_${String(i).padStart(2, '0')}`;
    const answerKey = `faqs_page.answer_${String(i).padStart(2, '0')}`;

    const question = t(questionKey);
    const answer = t(answerKey);

    // Stop when a question key is not found
    if (question === questionKey) {
      break;
    }

    faqsHtml += `
      <div class="faq-item">
        <button class="faq-question">
          <span>${question}</span>
          <span class="faq-icon">+</span>
        </button>
        <div class="faq-answer">
          ${answer}
        </div>
      </div>
    `;
    i++;
  }

  // Create a full HTML document with styles and accordion script
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
          margin: 0;
          padding: 15px;
          padding-bottom: ${tabBarHeight + 15}px;
        }
        .faq-item {
          border-bottom: 1px solid ${themeColors.inputBorder};
        }
        .faq-question {
          width: 100%;
          background-color: transparent;
          border: none;
          padding: 20px 0;
          text-align: justify;
          font-size: 16px;
          font-weight: bold;
          color: ${themeColors.text};
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .faq-icon {
          font-size: 24px;
          font-weight: normal;
          color: ${themeColors.tint};
        }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, padding 0.3s ease-out;
          padding: 0 10px;
          line-height: 1.6;
          text-align: justify;
        }
        .faq-answer.active {
            padding: 0 10px 20px 10px;
        }
        h3 { color: ${themeColors.tint}; }
        p, li { color: ${themeColors.text}; }
        a { color: ${themeColors.tint}; text-decoration: none; }
      </style>
    </head>
    <body>
      ${faqsHtml}
      <script>
        const items = document.querySelectorAll('.faq-item');
        items.forEach(item => {
          const question = item.querySelector('.faq-question');
          const answer = item.querySelector('.faq-answer');
          const icon = item.querySelector('.faq-icon');

          question.addEventListener('click', () => {
            const isActive = answer.classList.contains('active');
            
            // Close all other items
            items.forEach(otherItem => {
                otherItem.querySelector('.faq-answer').classList.remove('active');
                otherItem.querySelector('.faq-answer').style.maxHeight = null;
                otherItem.querySelector('.faq-icon').textContent = '+';
            });

            if (!isActive) {
                answer.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
                icon.textContent = '−';
            }
          });
        });
      </script>
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

export default FaqsScreen;
