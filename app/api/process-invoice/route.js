import axios from "axios";
import { NextResponse } from "next/server";
import FormData from "form-data";

export async function POST(request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Prepare FormData for Veryfi
    const form = new FormData();
    form.append("file", buffer, {
      filename: "invoice.pdf",
      contentType: "application/pdf",
    });

    // Veryfi API request
    const response = await axios.post(
      "https://api.veryfi.com/api/v8/partner/documents",
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "CLIENT-ID": process.env.VERYFI_CLIENT_ID,
          AUTHORIZATION: `apikey ${process.env.VERYFI_USERNAME}:${process.env.VERYFI_API_KEY}`,
          ...form.getHeaders(),
        },
      }
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error processing PDF with Veryfi:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { success: false, error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
