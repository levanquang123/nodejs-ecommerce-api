const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    street: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    postalCode: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    emailVerificationLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },
    emailVerificationFailedAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    refreshTokenSessionExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    refreshTokenSessions: {
      type: [
        {
          sessionId: {
            type: String,
            required: true,
          },
          clientType: {
            type: String,
            enum: ["web_admin", "mobile_client", "unknown"],
            default: "unknown",
          },
          refreshTokenHash: {
            type: String,
            required: true,
          },
          refreshTokenExpiresAt: {
            type: Date,
            required: true,
          },
          previousRefreshTokenHash: {
            type: String,
            default: null,
          },
          previousRefreshTokenValidUntil: {
            type: Date,
            default: null,
          },
          refreshTokenSessionExpiresAt: {
            type: Date,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
