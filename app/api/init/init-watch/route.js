// app/api/init/init-watch/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import googleService from "@/lib/services/googleService";
import CleaningService from "@/lib/services/cleaningService";

googleService.init();

// Replace filesystem operations with database functions
async function loadWatchedFolders() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT folder_id, channel_id, resource_id, EXTRACT(EPOCH FROM expires_at) * 1000 as expiration 
         FROM drive_watches WHERE expires_at > NOW()`
      );

      const watchedFolders = {};
      for (const row of result.rows) {
        watchedFolders[row.folder_id] = {
          channelId: row.channel_id,
          resourceId: row.resource_id,
          expiration: row.expiration.toString(),
        };
      }
      return watchedFolders;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error loading watched folders:", error);
    return {};
  }
}

export async function POST(request) {
  try {
    // Fetch folderIds
    const folderIdsRaw = await CleaningService.getFolderIds();

    if (
      !folderIdsRaw ||
      !Array.isArray(folderIdsRaw) ||
      folderIdsRaw.length === 0
    ) {
      console.error("No folder IDs returned:", folderIdsRaw);
      return NextResponse.json(
        {
          success: false,
          error: "No folder IDs retrieved",
        },
        { status: 400 }
      );
    }

    // Extract google_folder_id from each object
    const folderIds = folderIdsRaw
      .filter((item) => item && item.google_folder_id)
      .map((item) => item.google_folder_id);

    if (folderIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid folder IDs found",
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://kyanhub.com";

    const webhookUrl = `${baseUrl}/api/webhook/drive-notifications`;
    console.log("Using webhook URL:", webhookUrl);

    const watchedFolders = await loadWatchedFolders();
    const results = [];

    for (const folderId of folderIds) {
      try {
        if (!folderId) {
          results.push({
            folderId: "unknown",
            status: "error",
            error: "Invalid folder ID",
          });
          continue;
        }

        console.log(`Processing folder ID: ${folderId}`);
        const watchInfo = await googleService.startFolderWatch(
          folderId,
          webhookUrl
        );

        results.push({
          folderId,
          status: "watching",
          expiration: new Date(Number(watchInfo.expiration)).toISOString(),
        });
      } catch (error) {
        console.error(`Error watching folder ${folderId}:`, error);
        results.push({ folderId, status: "error", error: error.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error initializing watch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize watch" },
      { status: 500 }
    );
  }
}
