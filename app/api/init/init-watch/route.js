// app/api/init/init-watch/route.js
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import googleService from "@/lib/services/googleService";
import CleaningService from "@/lib/services/cleaningService";

googleService.init();

const watchedFoldersFile = path.join(process.cwd(), "watched-folders.json");

async function loadWatchedFolders() {
  try {
    const data = await fs.readFile(watchedFoldersFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log("No watched folders file found, starting fresh");
    return {};
  }
}

async function saveWatchedFolders(watchedFolders) {
  await fs.writeFile(
    watchedFoldersFile,
    JSON.stringify(watchedFolders, null, 2)
  );
}

export async function POST(request) {
  try {
    // Fetch folderIds
    const folderIdsRaw = await CleaningService.getFolderIds();

    // Extract google_folder_id from each object
    const folderIds = folderIdsRaw.map((item) => {
      if (item && typeof item === "object" && "google_folder_id" in item) {
        return item.google_folder_id;
      }
      throw new Error(`Invalid folder ID format: ${JSON.stringify(item)}`);
    });

    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      throw new Error("No valid folder IDs retrieved from CleaningService");
    }

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.VERCEL_URL || "https://kyanhub.vercel.app"
        : process.env.LOCAL_WEBHOOK_URL || "http://localhost:3000";

    const webhookUrl = `${baseUrl}/api/webhook/drive-notifications`;

    const watchedFolders = await loadWatchedFolders();
    const results = [];

    for (const folderId of folderIds) {
      try {
        const watchInfo = await googleService.startFolderWatch(
          folderId,
          webhookUrl
        );
        watchedFolders[folderId] = {
          channelId: watchInfo.channelId,
          resourceId: watchInfo.resourceId,
          expiration: watchInfo.expiration,
        };
        results.push({ folderId, status: "watching" });
      } catch (error) {
        results.push({ folderId, status: "error", error: error.message });
      }
    }

    await saveWatchedFolders(watchedFolders);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error initializing watch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize watch" },
      { status: 500 }
    );
  }
}
