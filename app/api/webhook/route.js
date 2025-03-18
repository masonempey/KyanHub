// app/api/webhook/route.js
import googleService from "@/lib/services/googleService";
import fs from "fs/promises";
import path from "path";

const watchedFoldersFile = path.join(process.cwd(), "watched-folders.json");
const fileStateFile = path.join(process.cwd(), "file-state.json");

async function loadWatchedFolders() {
  try {
    const data = await fs.readFile(watchedFoldersFile, "utf8");
    console.log("Loaded watched folders in webhook:", data);
    return JSON.parse(data);
  } catch (error) {
    console.log("No watched folders file found in webhook, starting fresh");
    return {};
  }
}

async function loadPreviousFiles() {
  try {
    const data = await fs.readFile(fileStateFile, "utf8");
    console.log("Loaded previous files:", data);
    return JSON.parse(data);
  } catch (error) {
    console.log("No previous files file found, starting fresh");
    return {};
  }
}

async function saveCurrentFiles(files) {
  console.log("Saving current files:", files);
  await fs.writeFile(fileStateFile, JSON.stringify(files, null, 2));
}

export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    console.log("Webhook headers received:", headers);

    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");
    const resourceId = req.headers.get("x-goog-resource-id");

    if (!channelId || !resourceState || !resourceId) {
      console.log("Missing required headers, assuming sync verification");
      return new Response(null, { status: 200 });
    }

    console.log(`Webhook received - Channel ID: ${channelId}`);
    console.log(`Resource State: ${resourceState}`);
    console.log(`Resource ID: ${resourceId}`);

    await googleService.init();
    const watchedFolders = await loadWatchedFolders();
    let previousFiles = await loadPreviousFiles();

    console.log(
      "Stored channel IDs:",
      Object.values(watchedFolders).map((f) => f.channelId)
    );

    const folderId = Object.keys(watchedFolders).find(
      (id) => watchedFolders[id].channelId === channelId
    );

    if (!folderId) {
      console.log(
        `Unknown channel ID: ${channelId}, checking all folders as fallback. Watched folders:`,
        watchedFolders
      );
      for (const folderId of Object.keys(watchedFolders)) {
        const currentFiles = await googleService.listFolderFiles(folderId);
        console.log(`Current files in ${folderId}:`, currentFiles);

        if (!previousFiles[folderId]) previousFiles[folderId] = [];

        // Detect new files
        const newFiles = currentFiles.filter(
          (current) =>
            !previousFiles[folderId].some((prev) => prev.id === current.id)
        );
        if (newFiles.length > 0) {
          console.log(`New file(s) detected in folder ${folderId}!`);
          console.log("New files:", newFiles);
        }

        // Detect deleted files
        const deletedFiles = previousFiles[folderId].filter(
          (prev) => !currentFiles.some((current) => current.id === prev.id)
        );
        if (deletedFiles.length > 0) {
          console.log(`File(s) deleted from folder ${folderId}!`);
          console.log("Deleted files:", deletedFiles);
        }

        if (newFiles.length === 0 && deletedFiles.length === 0) {
          console.log(`No changes detected in ${folderId}.`);
        }

        previousFiles[folderId] = currentFiles;
      }
      await saveCurrentFiles(previousFiles);
    } else {
      console.log(`Processing webhook for folder: ${folderId}`);

      if (resourceState === "sync") {
        console.log(
          "Sync message received - webhook verified for folder:",
          folderId
        );
        previousFiles[folderId] = await googleService.listFolderFiles(folderId);
        await saveCurrentFiles(previousFiles);
        console.log(`Initial files in ${folderId}:`, previousFiles[folderId]);
      } else if (
        resourceState === "add" ||
        resourceState === "update" ||
        resourceState === "trash"
      ) {
        const currentFiles = await googleService.listFolderFiles(folderId);
        console.log(`Current files in ${folderId}:`, currentFiles);

        if (!previousFiles[folderId]) previousFiles[folderId] = [];

        // Detect new files
        const newFiles = currentFiles.filter(
          (current) =>
            !previousFiles[folderId].some((prev) => prev.id === current.id)
        );
        if (newFiles.length > 0) {
          console.log(`New file(s) detected in folder ${folderId}!`);
          console.log("New files:", newFiles);
        }

        // Detect deleted files
        const deletedFiles = previousFiles[folderId].filter(
          (prev) => !currentFiles.some((current) => current.id === prev.id)
        );
        if (deletedFiles.length > 0) {
          console.log(`File(s) deleted from folder ${folderId}!`);
          console.log("Deleted files:", deletedFiles);
        }

        if (newFiles.length === 0 && deletedFiles.length === 0) {
          console.log(`No changes detected in ${folderId}.`);
        }

        previousFiles[folderId] = currentFiles;
        await saveCurrentFiles(previousFiles);
      } else {
        console.log(`Unhandled resource state: ${resourceState}`);
      }
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
