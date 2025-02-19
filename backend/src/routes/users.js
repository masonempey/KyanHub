const express = require("express");
const router = express.Router();
const UserService = require("../services/userService");
const admin = require("../middleware/firebase-admin");

// Gets all users
router.get("/", async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error Fetching Users", error: err.message });
  }
});

// Check if user that login with google exist?
router.post("/validate", async (req, res) => {
  try {
    const { uid } = req.body;
    const user = await UserService.getUserById(uid);
    res.status(200).json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user:", error);
    res
      .status(500)
      .json({ message: "Error checking user", error: error.message });
  }
});

// Create google users with no password
router.post("/googleregister", async (req, res) => {
  try {
    const { email, uid } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists in PostgreSQL
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return res
        .status(200)
        .json({ message: "User already exists", user: existingUser });
    }

    // Check if user already exists in Firebase
    try {
      await admin.auth().getUser(uid);
      return res
        .status(200)
        .json({ message: "User already exists in Firebase" });
    } catch (firebaseError) {
      if (firebaseError.code !== "auth/user-not-found") {
        throw firebaseError;
      }
    }

    // Create new user in PostgreSQL
    const roleId = await UserService.getDefaultRoleId();
    const newUser = await UserService.createUser(uid, email, roleId);

    // Create user in Firebase
    const firebaseUser = await admin.auth().createUser({
      uid,
      email,
    });

    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error in /googleregister route:", error);
    return res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
});

// Creates new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // error handling if users register with the same email
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    try {
      // create new users on firebase auth
      const firebaseUser = await admin.auth().createUser({
        email,
        password,
      });

      // get the firebase uid
      const firebaseUID = firebaseUser.uid;
      const roleId = await UserService.getDefaultRoleId();

      // create new users in PostgreSQL using uid from firebase auth
      const newUser = await UserService.createUser(
        firebaseUID,
        email,
        roleId,
        phoneNumber
      );

      return res
        .status(201)
        .json({ message: "User created successfully", user: newUser });
    } catch (firebaseError) {
      console.error("Error creating user in Firebase:", firebaseError);
      return res.status(500).json({
        message: "Error creating user in Firebase",
        error: firebaseError.message,
      });
    }
  } catch (err) {
    console.error("Error in /register route:", err);
    return res
      .status(500)
      .json({ message: "Error Creating User", error: err.message });
  }
});

// Gets user by id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await UserService.getUserById(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Cannot Find User by id of", id });
  }
});

// Deletes user by id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await UserService.deleteUserById(id);
    if (user) {
      res.status(200).json({ message: "User deleted successfully", user });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Cannot delete user by id of", id });
  }
});

// Update user by id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { email, password, roleId, phoneNumber } = req.body;

  if (!email && !password && !roleId && !phoneNumber) {
    return res
      .status(400)
      .json({ message: "At least one field is required to update" });
  }

  try {
    const updatedUser = await UserService.updateUserById(
      id,
      email,
      password,
      roleId,
      phoneNumber
    );
    if (updatedUser) {
      res
        .status(200)
        .json({ message: "User updated successfully", user: updatedUser });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
  }
});

module.exports = router;
