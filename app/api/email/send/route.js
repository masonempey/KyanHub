import { NextResponse } from "next/server";
import emailService from "@/lib/services/emailService";
import { auth } from "@/lib/firebase/admin";

function replaceVariables(template, variables) {
  if (!template || !variables) return template;

  let result = template;

  // Process all variables with the {{variable.name}} syntax
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];

  matches.forEach((match) => {
    // Extract the variable path (e.g., "property.name" from "{{property.name}}")
    const path = match.substring(2, match.length - 2).trim();

    // First check if the exact path exists as a key (dot notation format)
    if (variables[path] !== undefined) {
      result = result.replace(match, variables[path]);
      return;
    }

    // If not found, try the nested object approach
    let value = variables;
    for (const key of path.split(".")) {
      value = value && value[key];
      if (value === undefined) break;
    }

    // Replace the placeholder with the value (or empty string if not found)
    result = result.replace(match, value !== undefined ? value : "");
  });

  return result;
}

export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const {
      to,
      subject,
      message,
      buttonText,
      buttonUrl,
      templateId,
      variables,
    } = await request.json();

    // Replace variables in all text content
    const processedSubject = replaceVariables(subject, variables);
    const processedMessage = replaceVariables(message, variables);
    const processedButtonText = buttonText
      ? replaceVariables(buttonText, variables)
      : buttonText;
    const processedButtonUrl = buttonUrl
      ? replaceVariables(buttonUrl, variables)
      : buttonUrl;

    if (templateId) {
      const result = await emailService.sendTemplateEmail({
        to,
        templateId,
        variables,
      });

      if (!result.success) {
        if (result.error === "ACCESS_DENIED") {
          return NextResponse.json({ error: result.message }, { status: 403 });
        }
        if (result.error === "VERIFICATION_FAILED") {
          return NextResponse.json({ error: result.message }, { status: 401 });
        }

        return NextResponse.json(
          { error: result.error || "Failed to send email" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      // Send direct email
      if (!to || !processedSubject || !processedMessage) {
        return NextResponse.json(
          { error: "Recipient, subject and message are required" },
          { status: 400 }
        );
      }

      const result = await emailService.sendEmail({
        to,
        subject: processedSubject,
        message: processedMessage,
        buttonText: processedButtonText,
        buttonUrl: processedButtonUrl,
        variables,
      });

      if (!result.success) {
        if (result.error === "ACCESS_DENIED") {
          return NextResponse.json({ error: result.message }, { status: 403 });
        }
        if (result.error === "VERIFICATION_FAILED") {
          return NextResponse.json({ error: result.message }, { status: 401 });
        }

        return NextResponse.json(
          { error: result.error || "Failed to send email" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, messageId: result.messageId });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
