import { NextResponse } from "next/server";
import emailService from "@/lib/services/emailService";
import { auth } from "@/lib/firebase/admin";

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
      if (!to || !subject || !message) {
        return NextResponse.json(
          { error: "Recipient, subject and message are required" },
          { status: 400 }
        );
      }

      const result = await emailService.sendEmail({
        to,
        subject,
        message,
        buttonText,
        buttonUrl,
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
