// app/api/users/googleregister/route.js
import UserService from "@/lib/services/userService";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { email, uid } = await request.json();

    // Verify the token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return new Response(
        JSON.stringify({ message: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!email || !uid) {
      return new Response(
        JSON.stringify({ message: "Email and UID are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ message: "User already exists", user: existingUser }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const roleId = await UserService.getDefaultRoleId();
    const newUser = await UserService.createUser(uid, email, roleId);

    return new Response(
      JSON.stringify({ message: "User created successfully", user: newUser }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in /api/users/googleregister:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
