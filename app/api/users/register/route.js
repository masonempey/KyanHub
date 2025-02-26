// app/api/users/register/route.js
import UserService from "@/lib/services/userService";
import { admin } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { email, password, phoneNumber } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ message: "User already exists" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const firebaseUser = await admin.auth().createUser({ email, password });
    const firebaseUID = firebaseUser.uid;
    const roleId = await UserService.getDefaultRoleId();
    const newUser = await UserService.createUser(
      firebaseUID,
      email,
      roleId,
      phoneNumber
    );

    return new Response(
      JSON.stringify({ message: "User created successfully", user: newUser }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in /register route:", err);
    return new Response(
      JSON.stringify({ message: "Error Creating User", error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
