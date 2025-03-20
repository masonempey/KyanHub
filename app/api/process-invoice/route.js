// app/api/process-invoice/route.js
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import InvoiceService from "@/lib/services/invoiceService";
import NotificationService from "@/lib/services/notificationsService";

export async function POST(request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "File ID is required" },
        { status: 400 }
      );
    }

    // Download the file from Google Drive
    const fileData = await googleService.downloadFileAsBuffer(fileId);
    console.log(
      `Processing file: ${fileData.name} (${fileData.buffer.length} bytes)`
    );

    // Create a "started processing" notification
    await NotificationService.createNotification({
      title: `Processing Started: ${fileData.name}`,
      message: `Your invoice is being processed. You'll be notified when complete.`,
      type: "invoice_processing",
      data: { fileId, fileName: fileData.name },
    });

    // AlgoDocs setup
    const email = process.env.ALGODOCS_EMAIL;
    const apiKey = process.env.ALGODOCS_API_KEY;
    const extractorId = process.env.ALGODOCS_EXTRACTOR_ID;
    const folderId = process.env.ALGODOCS_FOLDER_ID;

    const headers = {
      Authorization: `Basic ${Buffer.from(`${email}:${apiKey}`).toString(
        "base64"
      )}`,
    };

    // Convert file to base64 and upload
    const base64Data = fileData.buffer.toString("base64");

    const formData = new FormData();
    formData.append("file_base64", base64Data);
    formData.append("filename", fileData.name);

    const url = `https://api.algodocs.com/v1/document/upload_base64/${extractorId}/${folderId}`;

    const uploadResponse = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("AlgoDocs upload error:", errorText);

      // Create error notification
      await NotificationService.createNotification({
        title: `Processing Failed: ${fileData.name}`,
        message: `There was an error uploading your invoice.`,
        type: "invoice_error",
        data: { fileId, fileName: fileData.name, error: errorText },
      });

      return NextResponse.json(
        { success: false, error: `AlgoDocs upload failed: ${errorText}` },
        { status: 500 }
      );
    }

    const uploadResult = await uploadResponse.json();
    const documentId = uploadResult.id;

    // Poll for extracted data
    let extractedData = null;
    const maxAttempts = 10;
    let attempts = 0;
    const pollInterval = 2000;

    while (!extractedData && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1} for document ${documentId}`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const extractResponse = await fetch(
        `https://api.algodocs.com/v1/extracted_data/${documentId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        console.error("AlgoDocs fetch error:", errorText);
        if (extractResponse.status === 404) {
          // Create error notification
          await NotificationService.createNotification({
            title: `Processing Failed: ${fileData.name}`,
            message: `Document not found on AlgoDocs.`,
            type: "invoice_error",
            data: {
              fileId,
              fileName: fileData.name,
              error: "Document not found",
            },
          });

          return NextResponse.json(
            { success: false, error: "Document not found" },
            { status: 404 }
          );
        }
        attempts++;
        continue;
      }

      const result = await extractResponse.json();
      console.log("Extract response:", result);

      if (
        result.extracted_data ||
        (result.status === "completed" && result.data)
      ) {
        extractedData = result.extracted_data || result.data;
      }

      attempts++;
    }

    if (!extractedData) {
      // Create timeout notification
      await NotificationService.createNotification({
        title: `Processing Timeout: ${fileData.name}`,
        message: `The invoice is taking longer than expected to process.`,
        type: "invoice_warning",
        data: { fileId, fileName: fileData.name },
      });

      return NextResponse.json(
        { success: false, error: "Timed out waiting for extraction" },
        { status: 500 }
      );
    }

    // Use correct case for service
    await InvoiceService.saveInvoiceData({
      fileId: fileId,
      fileName: fileData.name,
      extractedData: extractedData,
      processedAt: new Date(),
    });

    // Success notification is created in InvoiceService.saveInvoiceData
    // but we could add a custom one here if needed

    return NextResponse.json({
      success: true,
      message: "Invoice processed successfully",
      documentId: documentId,
      fileName: fileData.name,
      extractedData: extractedData,
    });
  } catch (error) {
    console.error("Error processing invoice:", error);

    // Create error notification for unhandled exceptions
    try {
      await NotificationService.createNotification({
        title: `Processing Error`,
        message: `Failed to process invoice: ${error.message}`,
        type: "invoice_error",
        data: { error: error.message },
      });
    } catch (notifyError) {
      console.error("Failed to create error notification:", notifyError);
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
