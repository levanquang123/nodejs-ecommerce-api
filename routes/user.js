const express = require("express");
const router = express.Router();
const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
const MIN_PASSWORD_LENGTH = 6;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET, 
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  const { password, ...rest } = plain;
  return rest;
}

function ok(res, data = null, message = "Success") {
  return res.json({
    success: true,
    message,
    data,
  });
}

function fail(res, message = "Error", status = 400) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// get all users
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password");
    return ok(res, users, "Users retrieved successfully.");
  })
);

// get current user profile
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return fail(res, "User not found", 404);
    }

    return ok(res, user, "User retrieved successfully.");
  })
);

// get user by id
router.get(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return fail(res, "User not found", 404);
    }

    return ok(res, user, "User retrieved successfully.");
  })
);

// register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    let { name, password } = req.body;

    name = name?.trim();

    if (!name || !password) {
      return fail(res, "Name and password are required");
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(
        res,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    const existUser = await User.findOne({ name });
    if (existUser) {
      return fail(res, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      password: hashedPassword,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        user: sanitizeUser(newUser),
        token,
      },
    });
  })
);

// login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    let { name, password } = req.body;

    name = name?.trim();

    if (!name || !password) {
      return fail(res, "Name and password are required");
    }

    const user = await User.findOne({ name });

    if (!user) {
      return fail(res, "Invalid name or password", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return fail(res, "Invalid name or password", 400);
    }

    const token = generateToken(user);

    return ok(
      res,
      {
        user: sanitizeUser(user),
        token,
      },
      "User login successfully."
    );
  })
);

// update user (only self)
router.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const userID = req.params.id;

    if (req.user.id !== userID) {
      return fail(res, "You can only update your own account", 403);
    }

    let { name, password } = req.body;
    const updateUser = {};

    if (name !== undefined) {
      name = name.trim();

      if (!name) {
        return fail(res, "Name cannot be empty");
      }

      const existUser = await User.findOne({ name });

      if (existUser && existUser._id.toString() !== userID) {
        return fail(res, "User name already exists");
      }

      updateUser.name = name;
    }

    if (password !== undefined) {
      if (!password || password.trim().length < MIN_PASSWORD_LENGTH) {
        return fail(
          res,
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        );
      }

      updateUser.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateUser).length === 0) {
      return fail(res, "No data provided for update");
    }

    const user = await User.findByIdAndUpdate(userID, updateUser, {
      new: true,
    }).select("-password");

    if (!user) {
      return fail(res, "User not found", 404);
    }

    return ok(res, user, "User updated successfully.");
  })
);

// delete user (only self)
router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const userID = req.params.id;

    if (req.user.id !== userID) {
      return fail(res, "You can only delete your own account", 403);
    }

    const user = await User.findByIdAndDelete(userID);

    if (!user) {
      return fail(res, "User not found", 404);
    }

    return ok(res, null, "User deleted successfully.");
  })
);

module.exports = router;