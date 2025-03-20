import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import googleService from "@/lib/services/googleService";
import NotificationService from "@/lib/services/notificationsService";

export async function POST(request) {
  // Inside your POST function
  try {
    // Move these outside the try block to ensure they're defined
    let client = null;
    let files = [];

    try {
      // Initialize Google service first
      await googleService.init();

      // Check headers sent by Google Drive
      const channelId = request.headers.get("x-goog-channel-id");
      const resourceState = request.headers.get("x-goog-resource-state");
      const resourceId = request.headers.get("x-goog-resource-id");

      console.log("Drive notification received:", {
        channelId,
        resourceState,
        resourceId,
      });

      // Skip non-change events
      if (!["change", "sync", "update"].includes(resourceState)) {
        return new Response("OK", { status: 200 });
      }

      // Connect to the database
      client = await pool.connect();

      // Get watch info
      const result = await client.query(
        "SELECT * FROM drive_watches WHERE channel_id = $1",
        [channelId]
      );

      if (result.rows.length === 0) {
        console.warn(`No watch found for channel ID: ${channelId}`);
        return new Response("OK", { status: 200 });
      }

      const watchInfo = result.rows[0];
      const folderId = watchInfo.folder_id;

      // List files in the folder
      files = await googleService.listFolderFiles(folderId);

      // Get files that already have notifications
      const notifiedResult = await client.query(
        `SELECT data->>'fileId' as file_id FROM notifications 
       WHERE type = 'google_drive' AND data->>'fileId' IS NOT NULL`
      );

      const notifiedFileIds = new Set(
        notifiedResult.rows.map((row) => row.file_id)
      );

      console.log(`Found ${notifiedFileIds.size} already notified files`);

      // Filter for recent files not yet notified - with strong transaction
      const recentFiles = files.filter((file) => {
        // Skip files we've already notified about
        if (notifiedFileIds.has(file.id)) {
          return false;
        }

        // Check if file was created/modified in last 15 minutes
        const fileDate = new Date(file.createdTime || file.modifiedTime);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return fileDate > fifteenMinutesAgo;
      });

      // Process new files with database transaction
      if (recentFiles.length > 0) {
        console.log(`Found ${recentFiles.length} new files to notify about`);

        // Begin transaction
        await client.query("BEGIN");

        try {
          for (const file of recentFiles) {
            // Double-check this file doesn't already have a notification (in transaction)
            const doubleCheckResult = await client.query(
              `SELECT id FROM notifications WHERE type = 'google_drive' AND data->>'fileId' = $1`,
              [file.id]
            );

            if (doubleCheckResult.rows.length > 0) {
              console.log(
                `Notification for file ${file.id} already exists, skipping`
              );
              continue;
            }

            // Create notification directly with SQL for atomicity
            await client.query(
              `INSERT INTO notifications 
             (title, message, type, data, is_read, created_at)
             VALUES ($1, $2, $3, $4, false, NOW())`,
              [
                `New File Uploaded: ${file.name}`,
                `A new file has been uploaded to the watched Google Drive folder.`,
                "google_drive",
                JSON.stringify({
                  fileId: file.id,
                  fileName: file.name,
                  mimeType: file.mimeType,
                  webViewLink: file.webViewLink,
                }),
              ]
            );

            console.log(`Created notification for new file: ${file.name}`);
          }

          // Commit transaction
          await client.query("COMMIT");
        } catch (error) {
          // Rollback on error
          await client.query("ROLLBACK");
          throw error;
        }
      } else {
        console.log("No new files to notify about");
      }

      return new Response("OK", { status: 200 });
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    console.error("Error processing drive notification:", error);
    return new Response("Error", { status: 500 });
  }
}
