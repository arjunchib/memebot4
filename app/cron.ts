import Baker from "cronbake";
import { CleanupAudioFilesTask } from "./tasks/cleanup_audio_files_task";
import { BackupDatabaseTask } from "./tasks/backup_database_task";
import { CleanupKvExpiredTask } from "./tasks/cleanup_kv_expired";

export function setupCron() {
  const baker = Baker.create();

  baker.add({
    name: "cleanup-audio-files",
    cron: "0 0 6 * * *", // 6am
    callback: async () => {
      await new CleanupAudioFilesTask().perform();
    },
  });

  baker.add({
    name: "cleanup-kv-expired",
    cron: "0 01 6 * * *", // 6:01am
    callback: async () => {
      await new CleanupKvExpiredTask().perform();
    },
  });

  baker.add({
    name: "backup-database",
    cron: "0 02 6 * * 1", // Mon 6:02am
    callback: async () => {
      await new BackupDatabaseTask().perform();
    },
  });

  baker.bakeAll();
}
