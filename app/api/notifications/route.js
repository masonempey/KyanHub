import { NextResponse } from "next/server";
import NotificationService from "@/lib/services/notificationsService";

export async function GET(request) {
  try {
    const notifications = await NotificationService.getNotifications(20);

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
