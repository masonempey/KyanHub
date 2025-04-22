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

    const newTemplate = await EmailTemplateService.createTemplate(
      templateData,
      "system"
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
