import React, { useState, useCallback } from "react";
import { StyleSheet, TextInput, View, Pressable } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { SourceProfile } from "@/services/luna";
import { Colors } from "@/constants/Colors";

interface SourceProfileSectionProps {
  profiles: SourceProfile[];
  activeProfileId: string | null;
  importUrl: string;
  onImportUrlChange: (url: string) => void;
  onSwitchProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SourceProfileSection({
  profiles,
  activeProfileId,
  importUrl,
  onImportUrlChange,
  onSwitchProfile,
  onDeleteProfile,
  onFocus,
  onBlur,
}: SourceProfileSectionProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleSectionFocus = () => {
    setIsSectionFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsSectionFocused(false);
    setFocusedIndex(null);
    onBlur?.();
  };

  // 计算 profile 按钮的总数（输入框索引为 0）
  const getTotalButtons = () => {
    let count = 1; // 输入框
    profiles.forEach((profile) => {
      count++; // profile button
      if (profile.type === "imported") {
        count++; // delete button
      }
    });
    return count;
  };

  // 计算每个 profile 按钮的索引
  const getProfileButtonIndex = (profileIndex: number) => {
    let index = 1; // 输入框是 0
    for (let i = 0; i < profileIndex; i++) {
      index++;
      if (profiles[i].type === "imported") {
        index++;
      }
    }
    return index;
  };

  const getDeleteButtonIndex = (profileIndex: number) => {
    let index = 1;
    for (let i = 0; i < profileIndex; i++) {
      index++;
      if (profiles[i].type === "imported") {
        index++;
      }
    }
    index++; // profile button
    return index;
  };

  // TV遥控器事件处理
  const handleTVEvent = useCallback(
    (event: any) => {
      if (!isSectionFocused) return;

      if (event.eventType === "select") {
        if (focusedIndex === 0) {
          // 输入框 - 什么都不做，让系统处理
        } else if (focusedIndex !== null) {
          // 触发当前聚焦按钮的操作
          let currentIndex = 1;
          for (const profile of profiles) {
            if (currentIndex === focusedIndex) {
              onSwitchProfile(profile.id);
              break;
            }
            currentIndex++;
            if (profile.type === "imported") {
              if (currentIndex === focusedIndex) {
                onDeleteProfile(profile.id);
                break;
              }
              currentIndex++;
            }
          }
        } else if (isSectionFocused) {
          setFocusedIndex(0);
        }
      } else if (event.eventType === "down") {
        if (focusedIndex !== null) {
          const maxIndex = getTotalButtons() - 1;
          setFocusedIndex(Math.min(focusedIndex + 1, maxIndex));
        } else {
          setFocusedIndex(0);
        }
      } else if (event.eventType === "up") {
        if (focusedIndex !== null) {
          setFocusedIndex(Math.max(focusedIndex - 1, 0));
        }
      }
    },
    [isSectionFocused, focusedIndex, profiles, onSwitchProfile, onDeleteProfile]
  );

  useTVEventHandler(handleTVEvent);

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <ThemedText style={styles.sectionTitle}>播放源档案</ThemedText>
      <ThemedText style={styles.label}>当前播放源档案</ThemedText>
      <ThemedText style={styles.value}>{activeProfile?.name ?? "未选择"}</ThemedText>

      <TextInput
        placeholder="输入播放源档案 JSON 网址"
        placeholderTextColor="#777"
        value={importUrl}
        onChangeText={onImportUrlChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={[styles.importUrlInput, focusedIndex === 0 && styles.inputFocused]}
        onFocus={() => setFocusedIndex(0)}
        onBlur={() => {
          if (focusedIndex === 0) {
            setFocusedIndex(null);
          }
        }}
      />

      <View style={styles.profileList}>
        {profiles.map((profile, profileIndex) => {
          const profileButtonIndex = getProfileButtonIndex(profileIndex);
          const deleteButtonIndex = profile.type === "imported" ? getDeleteButtonIndex(profileIndex) : null;

          return (
            <View key={profile.id} style={styles.profileItem}>
              <Pressable
                style={[
                  styles.profileButton,
                  profile.id === activeProfileId && styles.profileButtonSelected,
                  focusedIndex === profileButtonIndex && styles.buttonFocused,
                ]}
                hasTVPreferredFocus={focusedIndex === profileButtonIndex}
                onFocus={() => setFocusedIndex(profileButtonIndex)}
                onBlur={() => setFocusedIndex(null)}
                onPress={() => onSwitchProfile(profile.id)}
              >
                <ThemedText
                  style={[
                    styles.profileButtonText,
                    profile.id === activeProfileId && styles.profileButtonTextSelected,
                  ]}
                >
                  {profile.name}
                </ThemedText>
              </Pressable>
              {profile.type === "imported" && deleteButtonIndex !== null ? (
                <Pressable
                  style={[styles.deleteButton, focusedIndex === deleteButtonIndex && styles.buttonFocused]}
                  hasTVPreferredFocus={focusedIndex === deleteButtonIndex}
                  onFocus={() => setFocusedIndex(deleteButtonIndex)}
                  onBlur={() => setFocusedIndex(null)}
                  onPress={() => onDeleteProfile(profile.id)}
                >
                  <ThemedText style={styles.deleteButtonText}>删除 {profile.name}</ThemedText>
                </Pressable>
              ) : null}
            </View>
          );
        })}
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
  label: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  importUrlInput: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 8,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  profileList: {
    gap: 12,
  },
  profileItem: {
    gap: 8,
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: Colors.dark.border,
    alignSelf: "flex-start",
  },
  profileButtonSelected: {
    backgroundColor: Colors.dark.primary,
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
  profileButtonTextSelected: {
    color: Colors.dark.text,
  },
  buttonFocused: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
  },
});
