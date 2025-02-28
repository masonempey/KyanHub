// app/api/upload/maintenance/route.js
import { Buffer } from "buffer";
import GoogleService from "@/lib/services/googleService";
import dotenv from "dotenv";
dotenv.config();

export async function POST(request) {
  try {
    const { propertyName, monthYear, file, fileName } = await request.json();

    console.log("Uploading maintenance Invoice:", propertyName, monthYear);

    if (!propertyName || !monthYear) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Property name and month/year are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file uploaded" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const base64Data = file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    await GoogleService.init();
    const receiptsFolderId = await GoogleService.findReceiptsFolder(
      propertyName,
      monthYear
    );
    const { fileId, webViewLink } = await GoogleService.uploadPDF(
      buffer,
      fileName,
      receiptsFolderId
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { fileId, webViewLink, message: "File uploaded successfully" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
