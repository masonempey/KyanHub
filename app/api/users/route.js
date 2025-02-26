// app/api/users/route.js
import UserService from "@/lib/services/userService";

export async function GET() {
  try {
    const users = await UserService.getAllUsers();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: "Error Fetching Users", error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
