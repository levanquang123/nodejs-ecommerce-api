const express = require("express");
const router = express.Router();
const Category = require("../model/category");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const { uploadCategory } = require("../uploadFile");
const SubCategory = require("../model/subCategory");
const Product = require("../model/product");

//get all categories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const categoris = await Category.find();
      res.json({
        success: true,
        message: "Categories retrieved successfully.",
        data: categoris,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

//Get a category by id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const categoryID = req.params.id;
      const category = Category.findById(categoryID);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

//Create a new category with image upload
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      uploadCategory.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          if (err.code == "LIMIT_FILE_SIZE") {
            err.message = "File size is too large. Maximum filesize is 5MB.";
          }
          console.log(`Add category: ${err}`);
          return res.json({ success: false, message: err });
        } else if (err) {
          console.log(`Add category: ${err}`);
          return res.json({ success: false, message: err });
        }

        const { name } = req.body;
        if (!name) {
          res
            .status(400)
            .json({ success: false, message: "Name is required." });
        }
        let imageUrl = "no_url";
        if (req.file) {
          imageUrl = `http://localhost:3000/image/category/${req.file.filename}`;
        }

        const existCategory = await Category.findOne({ name });
        if (existCategory) {
          return res.json({
            success: false,
            message: "Category has alrealdy exist",
          });
        }
        const newCategory = new Category({
          name: name,
          image: imageUrl,
        });

        await newCategory.save();
        res.json({
          success: true,
          message: "Category created successfully.",
          data: null,
        });
      });
    } catch (error) {
      console.log(`Error creating category: ${error.message}`);
    }
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const categoryID = req.params.id;
      uploadCategory.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          if (err.code == "LIMIT_FILE_SIZE") {
            err.message = "File size is too large. Maximum filesize is 5MB.";
          }
          console.log(`Update category: ${err.message} `);
          return res.json({ success: false, message: err.message });
        } else if (err) {
          console.log(`Update category: ${err.message} `);
          return res.json({ success: false, message: err.message });
        }

        const { name } = req.body;
        let image = req.body.image;

        if (req.file) {
          image = `http://localhost:3000/image/category/${req.file.filename}`;
        }

        if (!name || !image) {
          return res
            .status(400)
            .json({ success: false, message: "Name and image are required." });
        }

        try {
          const updateCategory = await Category.findByIdAndUpdate(
            categoryID,
            { name: name, image: image },
            { new: true }
          );
          if (!updateCategory) {
            return res
              .status(404)
              .json({ success: false, message: "Category not found." });
          }
          res.json({
            success: true,
            message: "Category updated successfully.",
            data: null,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
    } catch (error) {
      console.log(`Error updating category: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const categoryID = req.params.id;

    const subCategories = await SubCategory.find({ categoryId: categoryID });
    if (subCategories.length > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete Category, subCategories are referencing it.",
      });
    }
    const products = await Product.find({ proCategoryId: categoryID });
    if (products.length > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete Category, products are referencing it.",
      });
    }

    const categoryDelete = await Category.findByIdAndDelete(categoryID);
    if (!categoryDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found." });
    }
    res.json({ success: true, message: "Category deleted successfully." });
  })
);

module.exports = router;
