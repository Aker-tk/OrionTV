import React, { useState, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { StyledButton } from "@/components/StyledButton";
import { SettingsSection } from "./SettingsSection";

interface SourceProfileSectionProps {
  onRestoreDefault: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SourceProfileSection({
  onRestoreDefault,
  onFocus,
  onBlur,
}: SourceProfileSectionProps) {
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const [isButtonFocused, setIsButtonFocused] = useState(false);

  const handleSectionFocus = () => {
    setIsSectionFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsSectionFocused(false);
    setIsButtonFocused(false);
    onBlur?.();
  };

  // TV遥控器事件处理
  const handleTVEvent = useCallback(
    (event: any) => {
      if (!isSectionFocused) return;

      if (event.eventType === "select") {
        onRestoreDefault();
      }
    },
    [isSectionFocused, onRestoreDefault]
  );

  useTVEventHandler(handleTVEvent);

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <ThemedText style={styles.sectionTitle}>播放源档案</ThemedText>
      <View style={styles.actionContainer}>
        <StyledButton
          accessibilityLabel="恢复 LunaTV 默认源"
          text="恢复 LunaTV 默认源"
          variant="primary"
          isSelected={isButtonFocused}
          onFocus={() => setIsButtonFocused(true)}
          onBlur={() => setIsButtonFocused(false)}
          onPress={onRestoreDefault}
        />
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  actionContainer: {
    alignSelf: "flex-start",
  },
});
