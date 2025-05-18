import { NextResponse } from "next/server";
import EmailService from "@/lib/services/emailService";
import OwnerService from "@/lib/services/ownerService";
import EmailTemplateService from "@/lib/services/emailTemplateService";

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
      spreadsheetUrl, // Add this to extract it from the request
    } = await request.json();

    console.log(`Attempting to send report email to owner ID: ${ownerId}`);
    console.log(`Spreadsheet URL: ${spreadsheetUrl || "Not provided"}`);

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
      console.log(`Found owner: ${owner.name}, email: ${owner.email}`);
    } catch (ownerError) {
      console.error("Error retrieving owner:", ownerError);
      return NextResponse.json(
        {
          success: false,
          error: `Error retrieving owner: ${ownerError.message}`,
        },
        { status: 500 }
      );
    }

    // Validate owner has email address
    if (!owner.email) {
      console.error(`Owner ${owner.name} has no email address`);
      return NextResponse.json(
        { success: false, error: "Owner has no email address" },
        { status: 400 }
      );
    }

    // Get the template ID from the owner record
    const templateId = owner.template_id;
    console.log(`Owner template ID: ${templateId || "none"}`);

    // If no template set for owner, use a default template
    let template;
    try {
      if (templateId) {
        template = await EmailTemplateService.getTemplateById(templateId);
        console.log(
          `Found owner's template: ${template ? template.name : "none"}`
        );
      }

      if (!template) {
        // Get the first template as default if owner doesn't have one
        const templates = await EmailTemplateService.getAllTemplates();
        template = templates.length > 0 ? templates[0] : null;
        console.log(
          `Using default template: ${template ? template.name : "none"}`
        );

        if (!template) {
          console.error("No email templates available");
          return NextResponse.json(
            { success: false, error: "No email templates available" },
            { status: 400 }
          );
        }
      }
    } catch (templateError) {
      console.error("Error retrieving email template:", templateError);
      return NextResponse.json(
        {
          success: false,
          error: `Error retrieving email template: ${templateError.message}`,
        },
        { status: 500 }
      );
    }

    // Format the numbers for display
    const formattedRevenue = totalRevenue.toFixed(2);
    const formattedCleaning = totalCleaning.toFixed(2);
    const formattedExpenses = expenses.toFixed(2);
    const formattedProfit = profit.toFixed(2);

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
      SPREADSHEET_URL: spreadsheetUrl || "", // This will now work correctly
      REPORT_LINK: `${
        process.env.NEXT_PUBLIC_BASE_URL || "https://www.kyanhub.com"
      }/property-management/properties/${propertyId}`,
    };

    console.log(
      `Sending email to ${owner.email} with template ID ${template.id}`
    );

    // Send the email
    try {
      const emailResult = await EmailService.sendTemplateEmail({
        to: owner.email,
        templateId: template.id,
        variables,
      });

      if (!emailResult.success) {
        console.error("Failed to send email:", emailResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to send email: ${emailResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`Email sent successfully to ${owner.email}`);
      return NextResponse.json({
        success: true,
        message: `Revenue report email sent to ${owner.email}`,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        { success: false, error: `Error sending email: ${emailError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in send-owner-report API:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
