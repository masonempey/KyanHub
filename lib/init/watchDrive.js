// lib/init/watchDrive.js
import fetchWithAuth from "@/lib/fetchWithAuth";
import CleaningService from "@/lib/services/cleaningService";

export async function initWatchedFolders() {
  try {
    // Get folder IDs from your cleaning service
    const folderIds = await CleaningService.getFolderIds();
    console.log("Initializing watched folders:", folderIds);

    const response = await fetchWithAuth("/api/init/init-watch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folderIds }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize watch: ${await response.text()}`);
    }

    const result = await response.json();
    console.log("Drive watching initialized:", result);
    return result;
  } catch (error) {
    console.error("Error initializing watched folders:", error);
    throw error;
  }
}
