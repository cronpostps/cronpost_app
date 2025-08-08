// src/components/PinModal.tsx
// Version: 1.0.1

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../store/ThemeContext';

interface PinModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  promptText?: string;
}

export interface PinModalRef {
  resetPin: () => void;
}

const PinModal = forwardRef<PinModalRef, PinModalProps>(
  ({ isVisible, onClose, onSubmit, promptText }, ref) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const themeColors = Colors[theme];
    const [pin, setPin] = useState(['', '', '', '']);
    const inputs = useRef<TextInput[]>([]);

    const resetPinAndFocus = () => {
      setPin(['', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    };

    useImperativeHandle(ref, () => ({
      resetPin: () => {
        resetPinAndFocus();
      },
    }));

    useEffect(() => {
      if (isVisible) {
        resetPinAndFocus();
      }
    }, [isVisible]);
    
    const handlePinChange = (text: string, index: number) => {
        if (text !== '' && !/^[0-9]$/.test(text)) {
          return;
        }
    
        const newPin = [...pin];
        newPin[index] = text;
        setPin(newPin);
    
        if (text && index < 3) {
          inputs.current[index + 1]?.focus();
        }
    };
      
    const handleBackspace = (index: number) => {
        if (pin[index] === '' && index > 0) {
          inputs.current[index - 1]?.focus();
        }
    };
      
    const handleSubmit = () => {
        const finalPin = pin.join('');
        if (finalPin.length === 4) {
          onSubmit(finalPin);
          Keyboard.dismiss();
        }
    };
    
    const styles = StyleSheet.create({
        overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
        content: { width: '85%', backgroundColor: themeColors.background, borderRadius: 10, padding: 20 },
        title: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, textAlign: 'center', marginBottom: 10 },
        prompt: { fontSize: 14, color: themeColors.icon, textAlign: 'center', marginBottom: 20 },
        pinContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
        pinInput: { width: 50, height: 50, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, textAlign: 'center', fontSize: 24, color: themeColors.text, backgroundColor: themeColors.inputBackground },
        button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    });
    
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
          <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.title}>{t('pin_modal.header')}</Text>
              <Text style={styles.prompt}>{promptText || t('pin_modal.default_prompt')}</Text>
              <View style={styles.pinContainer}>
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputs.current[index] = ref as TextInput; }}
                    style={styles.pinInput}
                    value={digit}
                    onChangeText={(text) => handlePinChange(text, index)}
                    onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace') { handleBackspace(index); } }}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>{t('pin_modal.btn_confirm')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
    );
  }
);

PinModal.displayName = 'PinModal';
export default PinModal;