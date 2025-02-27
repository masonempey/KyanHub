import { NextResponse } from "next/server";
import UserService from "@/lib/services/userService";
import { auth } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { email, uid } = await request.json();

    // Verify the token
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    try {
      // Verify token using the auth instance
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!email || !uid) {
      return NextResponse.json(
        { error: "Email and UID are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({
        message: "User already exists",
        user: existingUser,
      });
    }

    // Create new user with default role
    const roleId = await UserService.getDefaultRoleId();
    const newUser = await UserService.createUser(uid, email, roleId);

    return NextResponse.json(
      {
        message: "User created successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in /api/users/googleregister:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
