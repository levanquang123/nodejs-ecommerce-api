const express = require("express");
const router = express.Router();
const Poster = require("../model/poster");
const { uploadPosters } = require("../uploadFile");
const multer = require("multer");
const asyncHandler = require("express-async-handler");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.json({ success: false, message: "File size is too large. Maximum filesize is 5MB." });
  }
  return res.json({ success: false, message: err.message || err });
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
      return res.status(404).json({ success: false, message: "Poster not found." });
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
  "/",auth,admin,
  asyncHandler(async (req, res) => {
    uploadPosters.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const { posterName } = req.body;
      let imageUrl = "no_url";
      if (req.file) {
        imageUrl = `${BASE_URL}/image/poster/${req.file.filename}`;
      }
      if (!posterName) {
        return res.status(400).json({ success: false, message: "Name is required." });
      }

      const newPoster = new Poster({ posterName, imageUrl });
      await newPoster.save();
      res.json({
        success: true,
        message: "Poster created successfully.",
        data: null,
      });
    });
  })
);

// update a poster
router.put(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    uploadPosters.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const { posterName } = req.body;
      let image = req.body.image;
      if (req.file) {
        image = `${BASE_URL}/image/poster/${req.file.filename}`;
      }
      if (!posterName || !image) {
        return res.status(400).json({ success: false, message: "Name and image are required." });
      }

      const updatedPoster = await Poster.findByIdAndUpdate(
        posterID,
        { posterName, imageUrl: image },
        { new: true }
      );
      if (!updatedPoster) {
        return res.status(404).json({ success: false, message: "Poster not found." });
      }
      res.json({
        success: true,
        message: "Poster updated successfully.",
        data: null,
      });
    });
  })
);

// delete a poster
router.delete(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    const deletedPoster = await Poster.findByIdAndDelete(posterID);
    if (!deletedPoster) {
      return res.status(404).json({ success: false, message: "Poster not found." });
    }
    res.json({ success: true, message: "Poster deleted successfully." });
  })
);

module.exports = router;
