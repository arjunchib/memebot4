import Baker from "cronbake";
import { CleanupAudioFilesTask } from "./tasks/cleanup_audio_files_task";

export function setupCron() {
  const baker = Baker.create();

  baker.add({
    name: "cleanup-audio-files",
    // cron: "0 0 6 * * *",
    cron: "0 40 13 * * *",
    callback: async () => {
      await new CleanupAudioFilesTask().perform();
    },
  });

  baker.bakeAll();
}
