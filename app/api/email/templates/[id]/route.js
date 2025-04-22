import { NextResponse } from "next/server";
import EmailTemplateService from "@/lib/services/emailTemplateService";

// GET a single template
export async function GET(request, { params }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const template = await EmailTemplateService.getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT to update a template
export async function PUT(request, { params }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Get the entire request body and extract all relevant fields
    const templateData = await request.json();
    const { name, subject, message, buttonText, buttonUrl } = templateData;

    if (!name || !subject || !message) {
      return NextResponse.json(
        { error: "Name, subject and message are required" },
        { status: 400 }
      );
    }

    // Pass the entire template data to the service
    const updatedTemplate = await EmailTemplateService.updateTemplate({
      id,
      name,
      subject,
      message,
      buttonText,
      buttonUrl,
    });

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE a template
export async function DELETE(request, { params }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const deleted = await EmailTemplateService.deleteTemplate(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
