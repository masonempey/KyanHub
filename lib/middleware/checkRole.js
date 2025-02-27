import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import userService from "@/lib/services/userService";

export async function checkRole(request, requiredRole = 1) {
  try {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    console.log("Checking token:", token ? "Token exists" : "No token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No token provided",
        },
        {
          status: 401,
        }
      );
    }

    const decodedToken = await auth.verifyIdToken(token);
    const user = await userService.getUserById(decodedToken.uid);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    console.log("User role:", user.role_id);
    console.log("Required role:", requiredRole);

    if (user.role_id !== requiredRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Access granted",
      user: {
        id: user.user_id,
        role: user.role_id,
      },
    });
  } catch (error) {
    console.error("Role check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
}
