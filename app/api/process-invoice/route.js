// app/api/process-invoice/route.js
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";

export async function POST(request) {
  try {
    const { fileId } = await request.json();

    // if (!fileId) {
    //   return NextResponse.json(
    //     { success: false, error: "File ID is required" },
    //     { status: 400 }
    //   );
    // }

    // const fileData = await googleService.downloadFileAsBuffer(fileId);
    // console.log(
    //   `Processing file: ${fileData.name} (${fileData.buffer.length} bytes)`
    // );

    // const base64Data = fileData.buffer.toString("base64");
    // console.log("Base64 data length:", base64Data.length);

    const email = process.env.ALGODOCS_EMAIL;
    const apiKey = process.env.ALGODOCS_API_KEY;
    const extractorId = process.env.ALGODOCS_EXTRACTOR_ID;
    const folderId = process.env.ALGODOCS_FOLDER_ID;

    // const formData = new FormData();
    // formData.append("file_base64", base64Data);
    // formData.append("filename", fileData.name);

    // for (const [key, value] of formData.entries()) {
    //   console.log(`FormData entry: ${key}=${value.slice(0, 50)}...`);
    // }

    // const url = `https://api.algodocs.com/v1/document/upload_base64/${extractorId}/${folderId}`;
    // console.log("Request URL:", url);

    const headers = {
      Authorization: `Basic ${Buffer.from(`${email}:${apiKey}`).toString(
        "base64"
      )}`,
    };

    // const uploadResponse = await fetch(url, {
    //   method: "POST",
    //   headers,
    //   body: formData,
    // });

    // console.log("Request headers:", headers);
    // console.log("Response status:", uploadResponse.status);
    // console.log(
    //   "Response headers:",
    //   Object.fromEntries(uploadResponse.headers)
    // );

    // if (!uploadResponse.ok) {
    //   const errorText = await uploadResponse.text();
    //   console.error("AlgoDocs upload error:", errorText);
    //   return NextResponse.json(
    //     { success: false, error: `AlgoDocs upload failed: ${errorText}` },
    //     { status: 500 }
    //   );
    // }

    // const uploadResult = await uploadResponse.json();
    // console.log("Upload result:", uploadResult);
    // const documentId = uploadResult.id;

    const documentId = 1102237;

    // Poll for extracted data
    let extractedData = null;
    const maxAttempts = 10;
    let attempts = 0;
    const pollInterval = 2000;

    while (!extractedData && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1} for document ${documentId}`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const extractResponse = await fetch(
        `https://api.algodocs.com/v1/document/${documentId}`, // Corrected endpoint
        {
          method: "GET",
          headers,
        }
      );

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        console.error("AlgoDocs fetch error:", errorText);
        if (extractResponse.status === 404) {
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

      // Check for extracted data (adjust based on actual response)
      if (
        result.extracted_data ||
        (result.status === "completed" && result.data)
      ) {
        extractedData = result.extracted_data || result.data;
      }

      attempts++;
    }

    if (!extractedData) {
      return NextResponse.json(
        { success: false, error: "Timed out waiting for extraction" },
        { status: 500 }
      );
    }

    console.log("Extracted data:", extractedData);

    return NextResponse.json({
      success: true,
      message: "Invoice processed successfully",
      documentId: uploadResult.id,
      fileName: fileData.name,
      extractedData: extractedData,
    });
  } catch (error) {
    console.error("Error processing invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
