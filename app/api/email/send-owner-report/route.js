import { NextResponse } from "next/server";
import emailService from "@/lib/services/emailService"; // Import as default export
import OwnerService from "@/lib/services/ownerService";
import EmailTemplateService from "@/lib/services/emailTemplateService";
import googleService from "@/lib/services/googleService";

export async function POST(request) {
  try {
    const {
      ownerId,
      propertyName,
      propertyId,
      month,
      year,
      totalRevenue,
      totalCleaning,
      expenses,
      profit,
      bookingCount,
      spreadsheetUrl,
    } = await request.json();

    console.log(`Attempting to send report email to owner ID: ${ownerId}`);

    // Get the owner details
    let owner;
    try {
      owner = await OwnerService.getOwnerById(ownerId);
      if (!owner) {
        console.error(`Owner with ID ${ownerId} not found`);
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }
    } catch (ownerError) {
      console.error("Error fetching owner:", ownerError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch owner" },
        { status: 500 }
      );
    }

    // Format values for display
    const formattedRevenue = parseFloat(totalRevenue).toFixed(2);
    const formattedCleaning = parseFloat(totalCleaning).toFixed(2);
    const formattedExpenses = parseFloat(expenses).toFixed(2);
    const formattedProfit = parseFloat(profit).toFixed(2);

    // Extract the spreadsheet ID from the URL
    let sheetId = "";
    let attachment = null;

    if (spreadsheetUrl) {
      console.log(`Original URL: ${spreadsheetUrl}`);

      // Clean the URL if it contains duplicated URL structure
      let cleanUrl = spreadsheetUrl;
      if (
        spreadsheetUrl.indexOf("https://") !==
        spreadsheetUrl.lastIndexOf("https://")
      ) {
        // Extract just the last valid URL if there are duplicates
        cleanUrl = "https://" + spreadsheetUrl.split("https://").pop();
        console.log(`Cleaned URL: ${cleanUrl}`);
      }

      // Try multiple regex patterns to extract the ID
      const patterns = [
        /\/d\/([a-zA-Z0-9-_]{20,44})/, // Standard format /d/ID with length constraint
        /spreadsheets\/d\/([a-zA-Z0-9-_]{20,44})/, // Full URL format
        /id=([a-zA-Z0-9-_]{20,44})/, // URL parameter format id=ID
        /^([a-zA-Z0-9-_]{20,44})$/, // Direct ID only
      ];

      for (const pattern of patterns) {
        const matches = cleanUrl.match(pattern);
        if (matches && matches[1]) {
          sheetId = matches[1];
          console.log(`Found sheet ID: ${sheetId} from cleaned URL`);
          break;
        }
      }

      // Verify the sheet ID looks valid (not containing http, https or other URL parts)
      if (
        sheetId &&
        sheetId.length >= 20 &&
        !sheetId.includes("/") &&
        !sheetId.includes("\\")
      ) {
        try {
          // Initialize Google service
          await googleService.init();
          console.log("Google service initialized");

          // First verify the sheet exists
          try {
            const sheetMetadata = await googleService.sheets.spreadsheets.get({
              spreadsheetId: sheetId,
            });
            console.log(
              `Sheet verified: ${sheetMetadata.data.properties.title}`
            );

            // Export the sheet as Excel
            const excelFile = await googleService.exportSheetAsExcel(
              sheetId,
              propertyName,
              month,
              year
            );

            // Create attachment object
            attachment = {
              filename: excelFile.fileName,
              content: excelFile.content,
              type: excelFile.mimeType,
              disposition: "attachment",
            };

            console.log(
              `Attachment object created with size: ${attachment.content.length} bytes`
            );
          } catch (verifyError) {
            console.error(`Error verifying sheet existence:`, verifyError);
          }
        } catch (sheetError) {
          console.error("Error exporting spreadsheet:", sheetError);
        }
      } else {
        console.error(
          `Invalid sheet ID extracted: "${sheetId}" from URL: ${spreadsheetUrl}`
        );
      }
    }

    console.log("spreadsheetUrl received:", spreadsheetUrl);
    console.log("Extracted sheetId:", sheetId);

    // Create variables to replace in the email template
    const variables = {
      OWNER_NAME: owner.name || "Property Owner",
      PROPERTY_NAME: propertyName,
      MONTH: month,
      YEAR: year,
      TOTAL_REVENUE: formattedRevenue,
      CLEANING_FEES: formattedCleaning,
      EXPENSES: formattedExpenses,
      PROFIT: formattedProfit,
      BOOKING_COUNT: bookingCount.toString(),
    };

    console.log("Attachment object before sending email:", attachment);

    const emailResult = await emailService.sendTemplateEmail({
      to: owner.email,
      templateId: owner.template_id,
      variables: variables,
      attachments: attachment ? [attachment] : [],
    });

    console.log("Email send result:", emailResult);

    if (!emailResult.success) {
      console.error("Email send failed:", emailResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending owner report:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
