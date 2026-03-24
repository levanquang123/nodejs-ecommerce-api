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

exports.register = async ({ email, password }) => {
  email = email.trim().toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  const exist = await User.findOne({ email });
  if (exist) throw new Error("Email already exists");

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password: hashed,
  });

  const token = generateToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
};

exports.login = async ({ email, password }) => {
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");

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

  let { email, password } = body;
  const updateData = {};

  if (email !== undefined) {
    email = email.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== id) {
      throw new Error("Email already exists");
    }

    updateData.email = email;
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

exports.toggleFavorite = async (userId, productId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isFavorite = user.favorites.includes(productId);

  if (isFavorite) {
    user.favorites.pull(productId);
  } else {
    user.favorites.addToSet(productId);
  }

  await user.save();
  
  const updatedUser = await User.findById(userId)
    .populate("favorites")
    .select("-password");
    
  return updatedUser.favorites;
};

exports.getFavoriteProducts = async (userId) => {
  const user = await User.findById(userId)
    .populate("favorites")
    .select("favorites");

  if (!user) throw new Error("User not found");
  
  return user.favorites; 
};
