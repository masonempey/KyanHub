// app/api/users/[id]/route.js
import UserService from "@/lib/services/userService";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params; // Await params
    const { id } = resolvedParams;
    const user = await UserService.getUserById(id);
    if (user) {
      const role = await UserService.getRoleById(user.role_id);
      return new Response(
        JSON.stringify({ email: user.email, role: role.role }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const resolvedParams = await params; // Await params in catch block too
    const { id } = resolvedParams;
    console.error("GET /api/users/[id] error:", err); // Log the error for debugging
    return new Response(
      JSON.stringify({ message: "Cannot Find User by id of", id }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const user = await UserService.deleteUserById(id);
    if (user) {
      return new Response(
        JSON.stringify({ message: "User deleted successfully", user }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    console.error("DELETE /api/users/[id] error:", err);
    return new Response(
      JSON.stringify({ message: "Cannot delete user by id of", id }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { email, password, roleId, phoneNumber } = await request.json();

    if (!email && !password && !roleId && !phoneNumber) {
      return new Response(
        JSON.stringify({ message: "At least one field is required to update" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedUser = await UserService.updateUserById(
      id,
      email,
      password,
      roleId,
      phoneNumber
    );
    if (updatedUser) {
      return new Response(
        JSON.stringify({
          message: "User updated successfully",
          user: updatedUser,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    console.error("PUT /api/users/[id] error:", err);
    return new Response(
      JSON.stringify({ message: "Error updating user", error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
