const User = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const MIN_PASSWORD_LENGTH = 6;

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  const plain = user.toObject ? user.toObject() : user;
  const { password, ...rest } = plain;
  return rest;
}

exports.getAll = async () => {
  return await User.find().select("-password");
};

exports.getMe = async (userId) => {
  return await User.findById(userId).select("-password");
};

exports.getById = async (id) => {
  return await User.findById(id).select("-password");
};

exports.register = async ({ name, password }) => {
  name = name.trim();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  const exist = await User.findOne({ name });
  if (exist) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    password: hashed,
  });

  const token = generateToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
};

exports.login = async ({ name, password }) => {
  name = name.trim();

  const user = await User.findOne({ name });
  if (!user) throw new Error("Invalid name or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid name or password");

  const token = generateToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
};

exports.update = async (id, currentUser, body) => {
  if (currentUser.id !== id) {
    throw new Error("You can only update your own account");
  }

  let { name, password } = body;
  const updateData = {};

  if (name !== undefined) {
    name = name.trim();
    if (!name) throw new Error("Name cannot be empty");

    const exist = await User.findOne({ name });
    if (exist && exist._id.toString() !== id) {
      throw new Error("User name already exists");
    }

    updateData.name = name;
  }

  if (password !== undefined) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    updateData.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data provided for update");
  }

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  }).select("-password");

  if (!user) throw new Error("User not found");

  return user;
};

exports.delete = async (id, currentUser) => {
  if (currentUser.id !== id) {
    throw new Error("You can only delete your own account");
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) throw new Error("User not found");
};