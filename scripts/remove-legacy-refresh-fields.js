const mongoose = require("mongoose");

const config = require("../config/env");
const User = require("../model/user");

const LEGACY_REFRESH_FIELDS = [
  "refreshTokenHash",
  "refreshTokenExpiresAt",
  "refreshTokenSessionExpiresAt",
];

function hasApplyFlag() {
  return process.argv.includes("--apply");
}

function buildLegacyFieldQuery() {
  return {
    $or: LEGACY_REFRESH_FIELDS.map((field) => ({
      [field]: { $exists: true },
    })),
  };
}

async function main() {
  const apply = hasApplyFlag();
  await mongoose.connect(config.mongoUrl);

  const query = buildLegacyFieldQuery();
  const matchedCount = await User.collection.countDocuments(query);

  if (!apply) {
    console.log(
      `[dry-run] ${matchedCount} users contain legacy top-level refresh fields.`
    );
    console.log("Run with --apply to unset only those legacy fields.");
    return;
  }

  const unsetFields = LEGACY_REFRESH_FIELDS.reduce((fields, field) => {
    fields[field] = "";
    return fields;
  }, {});

  const result = await User.collection.updateMany(query, {
    $unset: unsetFields,
  });

  console.log(
    `Removed legacy top-level refresh fields from ${result.modifiedCount} users.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
