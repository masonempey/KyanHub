import { NextResponse } from "next/server";
import EmailTemplateService from "@/lib/services/emailTemplateService";

// GET all templates
export async function GET(request) {
  try {
    const templates = await EmailTemplateService.getAllTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST to create a new template
export async function POST(request) {
  try {
    const templateData = await request.json();

    if (!templateData.name || !templateData.subject) {
      return NextResponse.json(
        { error: "Name and subject are required" },
        { status: 400 }
      );
    }

    // For created_by, use a default value or remove if not needed
    const newTemplate = await EmailTemplateService.createTemplate(
      templateData,
      "system" // Default value or use request.headers.get("X-User-ID") if you set it elsewhere
    );

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// PUT to update a template
export async function PUT(request) {
  try {
    const templateData = await request.json();

    if (!templateData.id || !templateData.name || !templateData.subject) {
      return NextResponse.json(
        { error: "ID, name and subject are required" },
        { status: 400 }
      );
    }

    const updatedTemplate = await EmailTemplateService.updateTemplate(
      templateData
    );

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
