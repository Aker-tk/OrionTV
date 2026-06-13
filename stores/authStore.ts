import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useSettingsStore } from "./settingsStore";
import Toast from "react-native-toast-message";
import Logger from "@/utils/Logger";
import { isLocalModeApiBaseUrl } from "@/utils/localMode";

const logger = Logger.withTag('AuthStore');

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),
  checkLoginStatus: async (apiBaseUrl?: string) => {
    if (isLocalModeApiBaseUrl(apiBaseUrl)) {
      try {
        const loginResult = await api.login();
        set({
          isLoggedIn: Boolean(loginResult.ok),
          isLoginModalVisible: false,
        });
      } catch (error) {
        logger.error("Failed to auto-login local mode:", error);
        set({ isLoggedIn: false, isLoginModalVisible: false });
      }
      return;
    }

    if (!apiBaseUrl) {
      set({ isLoggedIn: false, isLoginModalVisible: false });
      return;
    }
    try {
      const settingsState = useSettingsStore.getState();
      const serverConfig = settingsState.serverConfig;

      // If server config is still loading, skip - we'll be called again when it's ready
      if (settingsState.isLoadingServerConfig) {
        return;
      }

      if (!serverConfig?.StorageType) {
        Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });
        return;
      }

      const authToken = await AsyncStorage.getItem('authCookies');
      if (!authToken) {
        const loginResult = await api.login().catch((error) => {
          logger.error("Failed to auto-login:", error);
          return null;
        });
        if (loginResult && loginResult.ok) {
          set({ isLoggedIn: true, isLoginModalVisible: false });
        } else {
          set({ isLoggedIn: false, isLoginModalVisible: false });
        }
      } else {
        set({ isLoggedIn: true, isLoginModalVisible: false });
      }
    } catch (error) {
      logger.error("Failed to check login status:", error);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        set({ isLoggedIn: false, isLoginModalVisible: true });
      } else {
        set({ isLoggedIn: false });
      }
    }
  },
  logout: async () => {
    try {
      await api.logout();
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to logout:", error);
    }
  },
}));

export default useAuthStore;
