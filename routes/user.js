const express = require("express");
const router = express.Router();
const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

//get all users
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await User.find();
    res.json({
      success: true,
      message: "User retrieved successfully.",
      data: users,
    });
  })
);

//get user by id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userID = req.params.id;
    const user = await User.findById(userID);
    if (!userID) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      message: "User retrieved successfully.",
      data: user,
    });
  })
);

//login
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Name, password are required" });
    }
    const existUser = await User.findOne({ name });
    if (existUser) {
      return res.json({ success: false, message: "User has alrealdy exist" });
    }

    const newUser = new User({
      name,
      password,
    });

    newUser.password = await bcrypt.hash(password, 10);
    await newUser.save();

    res.json({
      success: true,
      message: "Create user successfully.",
      data: newUser,
    });
  })
);

//login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Name, password are required" });
    }
    const user = await User.findOne({ name });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid name or password" });
    }
    res.json({
      success: true,
      message: "User login successfully.",
    });
  })
);

//update user
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, password } = req.body;
    const userID = req.params.id;
    const updateUser = {};
    if (name) {
      updateUser.name = name;
    }
    if (password) {
      updateUser.password = password;
    }
    const user = await User.findByIdAndUpdate(userID, updateUser, {
      new: true,
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User login successfully.",
      data: user,
    });
  })
);

// delete user 
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userID = req.params.id;
    if (!userID) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const user = await User.findByIdAndDelete(userID);
    res.json({
      success: true,
      message: "Delete user successfully.",
    });
  })
);

module.exports = router;
