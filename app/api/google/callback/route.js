import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import UserService from "@/lib/services/userService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Use this for the return path

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code provided" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await googleService.getTokens(code);

    // Verify this is the correct account (info@kyanproperties.com)
    // Set credentials temporarily to verify the user
    googleService.setCredentials(tokens);

    // Get user info to verify email
    const userInfoResponse = await googleService.gmail.users.getProfile({
      userId: "me",
    });

    const userEmail = userInfoResponse.data.emailAddress;

    if (userEmail !== "info@kyanproperties.com") {
      console.error(
        `Unauthorized email account: ${userEmail}. Only info@kyanproperties.com is allowed.`
      );

      // Revoke the token since it's not the right account
      await googleService.oauth2Client.revokeToken(tokens.access_token);

      return NextResponse.redirect(
        new URL("/reports?error=unauthorized_email", request.url)
      );
    }

    // If we get here, the email is correct - store the tokens
    await UserService.updateSystemSettings({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_scope: tokens.scope,
      google_token_expiry: tokens.expiry_date?.toString(),
      google_email: userEmail, // Store the email to verify later
    });

    console.log("Google tokens saved to system settings successfully");

    // Redirect back to the email page or wherever the user came from
    const returnPath = state || "/reports"; // Just use state, not localStorage
    return NextResponse.redirect(new URL(returnPath, request.url));
  } catch (error) {
    console.error("Error handling Google callback:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
