import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { StyledButton } from "@/components/StyledButton";
import { SettingsSection } from "./SettingsSection";
import { SourceProfile } from "@/services/luna";

interface SourceProfileSectionProps {
  profiles: SourceProfile[];
  activeProfileId: string | null;
  onImportPress: () => void;
  onSwitchProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onChanged: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SourceProfileSection({
  profiles,
  activeProfileId,
  onImportPress,
  onSwitchProfile,
  onDeleteProfile,
  onFocus,
  onBlur,
}: SourceProfileSectionProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;

  return (
    <SettingsSection focusable onFocus={onFocus} onBlur={onBlur}>
      <ThemedText style={styles.sectionTitle}>播放源档案</ThemedText>
      <ThemedText style={styles.label}>当前播放源档案</ThemedText>
      <ThemedText style={styles.value}>{activeProfile?.name ?? "未选择"}</ThemedText>

      <StyledButton text="导入 JSON" onPress={onImportPress} style={styles.actionButton} />

      <View style={styles.profileList}>
        {profiles.map((profile) => (
          <View key={profile.id} style={styles.profileItem}>
            <StyledButton
              text={profile.name}
              isSelected={profile.id === activeProfileId}
              onPress={() => onSwitchProfile(profile.id)}
              style={styles.profileButton}
            />
            {profile.type === "imported" ? (
              <StyledButton
                text={`删除 ${profile.name}`}
                variant="ghost"
                onPress={() => onDeleteProfile(profile.id)}
                style={styles.deleteButton}
              />
            ) : null}
          </View>
        ))}
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
  actionButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  profileList: {
    gap: 12,
  },
  profileItem: {
    gap: 8,
  },
  profileButton: {
    alignSelf: "flex-start",
  },
  deleteButton: {
    alignSelf: "flex-start",
  },
});
