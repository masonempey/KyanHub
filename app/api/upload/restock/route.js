// app/api/upload/restock/route.js
import { Buffer } from "buffer";
import GoogleService from "@/lib/services/googleService";
import KyanFinancialsService from "@/lib/services/kyanFinancialsService";
import dotenv from "dotenv";
dotenv.config();

export async function POST(request) {
  try {
    const { cost, store, description, monthYear, file, fileName } =
      await request.json();

    console.log("Uploading restock receipt:", store, monthYear);

    if (!cost || !store || !description || !monthYear) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cost, store, description, and month/year are required",
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

    const kyanReceiptsFolder = "Kyan Receipts";

    await GoogleService.init();

    // Find or create the Kyan Receipts parent folder
    const receiptsFolderId = await GoogleService.findKyanFinanceFolder(
      kyanReceiptsFolder
    );

    // Find or create the monthYear subfolder within Kyan Receipts
    const monthYearFolderId = await GoogleService.findKyanReceiptsSubfolder(
      receiptsFolderId,
      monthYear
    );

    // Upload the PDF to the monthYear subfolder
    const { fileId, webViewLink } = await GoogleService.uploadPDF(
      buffer,
      fileName,
      monthYearFolderId
    );

    const [month, year] = monthYear.match(/([a-zA-Z]+)(\d+)/).slice(1, 3);

    const kyanSheetId = "1Yj7-lhynaWQ_kYof-6fIhWVmK3xlzGFE2XpuqHix1bk";

    await GoogleService.uploadKyanFinanceValues(kyanSheetId, {
      month,
      year,
      cost,
      store,
      description,
      fileId,
    });

    const dateNow = new Date();
    const recordCode = `${store.substring(0, 3).toUpperCase()}-${year}${month
      .substring(0, 3)
      .toUpperCase()}-${Math.round(parseFloat(cost))}`;

    await KyanFinancialsService.insertRecord({
      dateSubmitted: dateNow,
      store,
      description,
      cost: parseFloat(cost),
      receiptImageUrl: webViewLink,
      recordCode: recordCode,
    });

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
