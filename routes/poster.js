const express = require("express");
const router = express.Router();
const Poster = require("../model/poster");
const { uploadPosters } = require("../uploadFile");
const multer = require("multer");
const asyncHandler = require("express-async-handler");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size is too large. Maximum filesize is 5MB.",
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Upload failed.",
  });
}

// get all posters
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const posters = await Poster.find({});

    res.json({
      success: true,
      message: "Posters retrieved successfully.",
      data: posters,
    });
  })
);

// get a poster by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    const poster = await Poster.findById(posterID);

    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found.",
      });
    }

    res.json({
      success: true,
      message: "Poster retrieved successfully.",
      data: poster,
    });
  })
);

// create a new poster
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    uploadPosters.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      let { posterName } = req.body;

      if (!posterName) {
        return res.status(400).json({
          success: false,
          message: "Name is required.",
        });
      }

      posterName = posterName.toLowerCase();

      const existPoster = await Poster.findOne({ posterName });
      if (existPoster) {
        return res.status(400).json({
          success: false,
          message: "Poster already exists.",
        });
      }

      const imageUrl = req.file ? req.file.path : "no_url";

      const newPoster = new Poster({
        posterName,
        imageUrl,
      });

      await newPoster.save();

      res.status(201).json({
        success: true,
        message: "Poster created successfully.",
        data: newPoster,
      });
    });
  })
);

// update a poster
router.put(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;

    uploadPosters.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      let { posterName } = req.body;

      const poster = await Poster.findById(posterID);

      if (!poster) {
        return res.status(404).json({
          success: false,
          message: "Poster not found.",
        });
      }

      if (posterName) {
        posterName = posterName.toLowerCase();

        const existPoster = await Poster.findOne({
          posterName,
          _id: { $ne: posterID },
        });

        if (existPoster) {
          return res.status(400).json({
            success: false,
            message: "Poster already exists.",
          });
        }

        poster.posterName = posterName;
      }

      if (req.file) {
        poster.imageUrl = req.file.path;
      }

      await poster.save();

      res.json({
        success: true,
        message: "Poster updated successfully.",
        data: poster,
      });
    });
  })
);

// delete a poster
router.delete(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    const deletedPoster = await Poster.findByIdAndDelete(posterID);

    if (!deletedPoster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found.",
      });
    }

    res.json({
      success: true,
      message: "Poster deleted successfully.",
    });
  })
);

module.exports = router;