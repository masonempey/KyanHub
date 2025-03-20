import { NextResponse } from "next/server";
import NotificationService from "@/lib/services/notificationsService";

export async function GET(request) {
  try {
    const count = await NotificationService.getUnreadCount();

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
