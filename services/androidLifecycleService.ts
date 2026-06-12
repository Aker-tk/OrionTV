import { AppStateStatus, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { ANDROID_NOTIFICATION_CHANNELS, BACKGROUND_SEARCH_TASK } from "@/constants/android";
import { searchVideos } from "@/services/luna";
import Logger from "@/utils/Logger";

const logger = Logger.withTag("AndroidLifecycle");

let taskDefined = false;

function ensureBackgroundTaskDefined() {
  if (taskDefined) {
    return;
  }

  TaskManager.defineTask(BACKGROUND_SEARCH_TASK, async () => {
    try {
      await searchVideos("热门", 1);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      logger.warn("Background search refresh failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  taskDefined = true;
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    ANDROID_NOTIFICATION_CHANNELS.backgroundTasks.id,
    {
      name: ANDROID_NOTIFICATION_CHANNELS.backgroundTasks.name,
      description: ANDROID_NOTIFICATION_CHANNELS.backgroundTasks.description,
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.SECRET,
      showBadge: false,
      sound: null,
    }
  );
}

export async function registerAndroidBackgroundTask() {
  if (Platform.OS !== "android") {
    return;
  }

  ensureBackgroundTaskDefined();

  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    logger.warn("Background fetch unavailable:", status);
    return;
  }

  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SEARCH_TASK);
  if (!alreadyRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SEARCH_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function initializeAndroidLifecycle() {
  await ensureAndroidNotificationChannel();
  await registerAndroidBackgroundTask();
}

export function handleAndroidAppStateChange(nextState: AppStateStatus) {
  if (Platform.OS !== "android") {
    return;
  }

  logger.info(`App state changed: ${nextState}`);
}
