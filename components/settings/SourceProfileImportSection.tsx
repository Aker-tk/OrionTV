import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { Colors } from "@/constants/Colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRemoteControlStore } from "@/stores/remoteControlStore";

interface SourceProfileImportSectionProps {
  importUrl: string;
  onImportUrlChange: (url: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface SourceProfileImportSectionRef {
  setInputValue: (value: string) => void;
}

export const SourceProfileImportSection = forwardRef<SourceProfileImportSectionRef, SourceProfileImportSectionProps>(({
  importUrl,
  onImportUrlChange,
  onFocus,
  onBlur,
}, ref) => {
  const { remoteInputEnabled } = useSettingsStore();
  const { serverUrl } = useRemoteControlStore();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    setInputValue: onImportUrlChange,
  }));

  const handleSectionFocus = () => {
    setIsSectionFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsSectionFocused(false);
    onBlur?.();
  };

  const handleTVEvent = React.useCallback(
    (event: any) => {
      if (isSectionFocused && event.eventType === "select") {
        inputRef.current?.focus();
      }
    },
    [isSectionFocused]
  );

  useTVEventHandler(handleTVEvent);

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <View style={styles.inputContainer}>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.sectionTitle}>播放源导入地址</ThemedText>
          {remoteInputEnabled && serverUrl && (
            <ThemedText style={styles.subtitle}>用手机访问 {serverUrl}，可远程输入</ThemedText>
          )}
        </View>
        <TextInput
          ref={inputRef}
          style={[styles.input, isInputFocused && styles.inputFocused]}
          value={importUrl}
          onChangeText={onImportUrlChange}
          placeholder="输入播放源档案 JSON 网址"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onFocus={() => {
            setIsInputFocused(true);
            const end = importUrl.length;
            setSelection({ start: end, end });
            setTimeout(() => {
              inputRef.current?.setNativeProps({ selection: { start: end, end } });
            }, 0);
          }}
          selection={selection}
          onSelectionChange={({ nativeEvent: { selection } }: any) => setSelection(selection)}
          onBlur={() => setIsInputFocused(false)}
        />
      </View>
    </SettingsSection>
  );
});

SourceProfileImportSection.displayName = "SourceProfileImportSection";

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 12,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#3a3a3c",
    color: "white",
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});
