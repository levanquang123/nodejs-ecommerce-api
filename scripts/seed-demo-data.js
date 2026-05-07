const mongoose = require("mongoose");
const crypto = require("crypto");

const config = require("../config/env");
const Brand = require("../model/brand");
const Category = require("../model/category");
const Coupon = require("../model/couponCode");
const Poster = require("../model/poster");
const Product = require("../model/product");
const SubCategory = require("../model/subCategory");
const Variant = require("../model/variant");
const VariantType = require("../model/variantType");

const image = (id, params = "auto=format&fit=crop&w=1200&q=80") =>
  `https://images.unsplash.com/${id}?${params}`;

const assets = {
  phonePurple: image("photo-1598327105666-5b89351aff97"),
  phoneBlue: image("photo-1511707171634-5f897ff02aa9"),
  laptopGaming: image("photo-1603302576837-37561b2e2302"),
  laptopSilver: image("photo-1496181133206-80ce9b88a853"),
  earbuds: image("photo-1606220945770-b5b6c2c55bf1"),
  headphones: image("photo-1505740420928-5e560c06d30e"),
  watchSport: image("photo-1523275335684-37898b6baf30"),
  watchClassic: image("photo-1434493789847-2f02dc6ca35d"),
  salePoster: image("photo-1607083206968-13611e3d76db", "auto=format&fit=crop&w=1400&q=80"),
  laptopPoster: image("photo-1517336714731-489689fd1ca8", "auto=format&fit=crop&w=1400&q=80"),
  audioPoster: image("photo-1546435770-a3e426bf472b", "auto=format&fit=crop&w=1400&q=80"),
};

async function upsertByName(Model, name, data) {
  return await Model.findOneAndUpdate(
    { name },
    { $set: { name, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertPoster(posterName, imageUrl) {
  return await Poster.findOneAndUpdate(
    { posterName },
    { $set: { posterName, imageUrl } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertCoupon(couponCode, data) {
  return await Coupon.findOneAndUpdate(
    { couponCode },
    { $set: { couponCode, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertProduct(name, data) {
  return await Product.findOneAndUpdate(
    { name },
    { $set: { name, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function productImages(...urls) {
  return urls.map((url, index) => ({ image: index + 1, url }));
}

function attr(variantTypeId, variantId) {
  return { variantTypeId, variantId };
}

function sku({ sku, attributes, price, offerPrice, quantity, images }) {
  return {
    _id: stableObjectId(sku),
    sku,
    attributes,
    price,
    offerPrice,
    quantity,
    images: productImages(...images),
    isActive: true,
  };
}

function stableObjectId(value) {
  return new mongoose.Types.ObjectId(
    crypto.createHash("md5").update(String(value)).digest("hex").slice(0, 24)
  );
}

async function seed() {
  await mongoose.connect(config.mongoUrl);

  const categories = {
    phones: await upsertByName(Category, "Phones", {
      image: assets.phoneBlue,
    }),
    laptops: await upsertByName(Category, "Laptops", {
      image: assets.laptopSilver,
    }),
    audio: await upsertByName(Category, "Audio", {
      image: assets.headphones,
    }),
    wearables: await upsertByName(Category, "Wearables", {
      image: assets.watchSport,
    }),
  };

  const subCategories = {
    smartphones: await upsertByName(SubCategory, "Smartphones", {
      categoryId: categories.phones._id,
    }),
    gamingLaptops: await upsertByName(SubCategory, "Gaming Laptops", {
      categoryId: categories.laptops._id,
    }),
    wirelessAudio: await upsertByName(SubCategory, "Wireless Audio", {
      categoryId: categories.audio._id,
    }),
    smartwatches: await upsertByName(SubCategory, "Smartwatches", {
      categoryId: categories.wearables._id,
    }),
  };

  const brands = {
    nova: await upsertByName(Brand, "Nova", {
      subCategoryId: subCategories.smartphones._id,
    }),
    apex: await upsertByName(Brand, "Apex", {
      subCategoryId: subCategories.gamingLaptops._id,
    }),
    sonic: await upsertByName(Brand, "Sonic", {
      subCategoryId: subCategories.wirelessAudio._id,
    }),
    pulse: await upsertByName(Brand, "Pulse", {
      subCategoryId: subCategories.smartwatches._id,
    }),
  };

  const variantTypes = {
    color: await upsertByName(VariantType, "color", { type: "Color" }),
    storage: await upsertByName(VariantType, "storage", { type: "Storage" }),
    size: await upsertByName(VariantType, "size", { type: "Size" }),
  };

  const variant = async (name, variantTypeId) =>
    await Variant.findOneAndUpdate(
      { name, variantTypeId },
      { $set: { name, variantTypeId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

  const variants = {
    black: await variant("midnight black", variantTypes.color._id),
    silver: await variant("silver", variantTypes.color._id),
    violet: await variant("violet", variantTypes.color._id),
    blue: await variant("sky blue", variantTypes.color._id),
    storage128: await variant("128gb", variantTypes.storage._id),
    storage256: await variant("256gb", variantTypes.storage._id),
    size40: await variant("40mm", variantTypes.size._id),
    size44: await variant("44mm", variantTypes.size._id),
  };

  const products = [
    await upsertProduct("Nova Mobile S9", {
      description:
        "A lightweight everyday smartphone with a bright display, long battery life, and a clean camera setup for daily photos.",
      quantity: 34,
      price: 699,
      offerPrice: 629,
      proCategoryId: categories.phones._id,
      proSubCategoryId: subCategories.smartphones._id,
      proBrandId: brands.nova._id,
      proVariantTypeId: variantTypes.color._id,
      proVariantId: [variants.violet._id.toString(), variants.black._id.toString()],
      images: productImages(assets.phonePurple, assets.phoneBlue),
      variants: [
        sku({
          sku: "NOVA-S9-VIOLET-128",
          attributes: [
            attr(variantTypes.color._id, variants.violet._id),
            attr(variantTypes.storage._id, variants.storage128._id),
          ],
          price: 699,
          offerPrice: 629,
          quantity: 12,
          images: [assets.phonePurple],
        }),
        sku({
          sku: "NOVA-S9-BLACK-256",
          attributes: [
            attr(variantTypes.color._id, variants.black._id),
            attr(variantTypes.storage._id, variants.storage256._id),
          ],
          price: 799,
          offerPrice: 729,
          quantity: 8,
          images: [assets.phoneBlue],
        }),
      ],
    }),
    await upsertProduct("Nova Mobile S9 Plus", {
      description:
        "A larger phone for streaming, shopping, and multitasking with extra storage and smooth performance.",
      quantity: 22,
      price: 849,
      offerPrice: 779,
      proCategoryId: categories.phones._id,
      proSubCategoryId: subCategories.smartphones._id,
      proBrandId: brands.nova._id,
      proVariantTypeId: variantTypes.storage._id,
      proVariantId: [variants.storage128._id.toString(), variants.storage256._id.toString()],
      images: productImages(assets.phoneBlue, assets.phonePurple),
      variants: [
        sku({
          sku: "NOVA-S9P-BLUE-128",
          attributes: [
            attr(variantTypes.color._id, variants.blue._id),
            attr(variantTypes.storage._id, variants.storage128._id),
          ],
          price: 849,
          offerPrice: 779,
          quantity: 10,
          images: [assets.phoneBlue],
        }),
        sku({
          sku: "NOVA-S9P-SILVER-256",
          attributes: [
            attr(variantTypes.color._id, variants.silver._id),
            attr(variantTypes.storage._id, variants.storage256._id),
          ],
          price: 929,
          offerPrice: 859,
          quantity: 6,
          images: [assets.phonePurple],
        }),
      ],
    }),
    await upsertProduct("Apex Gaming Pro 7", {
      description:
        "A performance laptop for games, creative work, and heavy browser sessions with a vivid display and strong cooling.",
      quantity: 15,
      price: 1399,
      offerPrice: 1249,
      proCategoryId: categories.laptops._id,
      proSubCategoryId: subCategories.gamingLaptops._id,
      proBrandId: brands.apex._id,
      proVariantTypeId: variantTypes.storage._id,
      proVariantId: [variants.storage256._id.toString()],
      images: productImages(assets.laptopGaming, assets.laptopSilver),
      variants: [
        sku({
          sku: "APEX-GP7-BLK-256",
          attributes: [
            attr(variantTypes.color._id, variants.black._id),
            attr(variantTypes.storage._id, variants.storage256._id),
          ],
          price: 1399,
          offerPrice: 1249,
          quantity: 7,
          images: [assets.laptopGaming],
        }),
      ],
    }),
    await upsertProduct("Apex Ultrabook Air 14", {
      description:
        "A slim laptop for school, work, travel, and daily productivity with a comfortable keyboard and bright screen.",
      quantity: 18,
      price: 1099,
      offerPrice: 989,
      proCategoryId: categories.laptops._id,
      proSubCategoryId: subCategories.gamingLaptops._id,
      proBrandId: brands.apex._id,
      proVariantTypeId: variantTypes.color._id,
      proVariantId: [variants.silver._id.toString(), variants.black._id.toString()],
      images: productImages(assets.laptopSilver, assets.laptopGaming),
      variants: [
        sku({
          sku: "APEX-AIR14-SILVER-256",
          attributes: [
            attr(variantTypes.color._id, variants.silver._id),
            attr(variantTypes.storage._id, variants.storage256._id),
          ],
          price: 1099,
          offerPrice: 989,
          quantity: 9,
          images: [assets.laptopSilver],
        }),
      ],
    }),
    await upsertProduct("Sonic Wave Buds", {
      description:
        "Compact wireless earbuds with clear calls, quick pairing, and a pocket-friendly charging case.",
      quantity: 45,
      price: 129,
      offerPrice: 99,
      proCategoryId: categories.audio._id,
      proSubCategoryId: subCategories.wirelessAudio._id,
      proBrandId: brands.sonic._id,
      proVariantTypeId: variantTypes.color._id,
      proVariantId: [variants.black._id.toString(), variants.silver._id.toString()],
      images: productImages(assets.earbuds, assets.headphones),
      variants: [
        sku({
          sku: "SONIC-WAVE-BLACK",
          attributes: [attr(variantTypes.color._id, variants.black._id)],
          price: 129,
          offerPrice: 99,
          quantity: 20,
          images: [assets.earbuds],
        }),
        sku({
          sku: "SONIC-WAVE-SILVER",
          attributes: [attr(variantTypes.color._id, variants.silver._id)],
          price: 129,
          offerPrice: 109,
          quantity: 15,
          images: [assets.earbuds],
        }),
      ],
    }),
    await upsertProduct("Sonic Studio Headphones", {
      description:
        "Comfortable over-ear headphones with immersive sound for music, movies, meetings, and focused work.",
      quantity: 28,
      price: 249,
      offerPrice: 199,
      proCategoryId: categories.audio._id,
      proSubCategoryId: subCategories.wirelessAudio._id,
      proBrandId: brands.sonic._id,
      proVariantTypeId: variantTypes.color._id,
      proVariantId: [variants.black._id.toString()],
      images: productImages(assets.headphones),
      variants: [
        sku({
          sku: "SONIC-STUDIO-BLACK",
          attributes: [attr(variantTypes.color._id, variants.black._id)],
          price: 249,
          offerPrice: 199,
          quantity: 16,
          images: [assets.headphones],
        }),
      ],
    }),
    await upsertProduct("Pulse Watch Active", {
      description:
        "A daily fitness smartwatch with health tracking, notifications, and an all-day battery.",
      quantity: 31,
      price: 229,
      offerPrice: 189,
      proCategoryId: categories.wearables._id,
      proSubCategoryId: subCategories.smartwatches._id,
      proBrandId: brands.pulse._id,
      proVariantTypeId: variantTypes.size._id,
      proVariantId: [variants.size40._id.toString(), variants.size44._id.toString()],
      images: productImages(assets.watchSport, assets.watchClassic),
      variants: [
        sku({
          sku: "PULSE-ACTIVE-40-BLK",
          attributes: [
            attr(variantTypes.size._id, variants.size40._id),
            attr(variantTypes.color._id, variants.black._id),
          ],
          price: 229,
          offerPrice: 189,
          quantity: 14,
          images: [assets.watchSport],
        }),
        sku({
          sku: "PULSE-ACTIVE-44-SILVER",
          attributes: [
            attr(variantTypes.size._id, variants.size44._id),
            attr(variantTypes.color._id, variants.silver._id),
          ],
          price: 249,
          offerPrice: 209,
          quantity: 10,
          images: [assets.watchClassic],
        }),
      ],
    }),
    await upsertProduct("Pulse Watch Classic", {
      description:
        "A clean smartwatch design for everyday wear with notifications, activity tracking, and quick controls.",
      quantity: 20,
      price: 279,
      offerPrice: 239,
      proCategoryId: categories.wearables._id,
      proSubCategoryId: subCategories.smartwatches._id,
      proBrandId: brands.pulse._id,
      proVariantTypeId: variantTypes.size._id,
      proVariantId: [variants.size44._id.toString()],
      images: productImages(assets.watchClassic, assets.watchSport),
      variants: [
        sku({
          sku: "PULSE-CLASSIC-44-SILVER",
          attributes: [
            attr(variantTypes.size._id, variants.size44._id),
            attr(variantTypes.color._id, variants.silver._id),
          ],
          price: 279,
          offerPrice: 239,
          quantity: 8,
          images: [assets.watchClassic],
        }),
      ],
    }),
  ];

  await Promise.all([
    upsertPoster("summer sale 2026", assets.salePoster),
    upsertPoster("laptop deals", assets.laptopPoster),
    upsertPoster("audio week", assets.audioPoster),
  ]);

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  await Promise.all([
    upsertCoupon("welcome10", {
      discountType: "percentage",
      discountAmount: 10,
      minimumPurchaseAmount: 100,
      endDate: expiresAt,
      status: "active",
    }),
    upsertCoupon("audio25", {
      discountType: "fixed",
      discountAmount: 25,
      minimumPurchaseAmount: 150,
      endDate: expiresAt,
      status: "active",
      applicableCategory: categories.audio._id,
    }),
  ]);

  console.log("Demo seed completed.");
  console.log(`Categories: ${Object.keys(categories).length}`);
  console.log(`Subcategories: ${Object.keys(subCategories).length}`);
  console.log(`Brands: ${Object.keys(brands).length}`);
  console.log(`Variant types: ${Object.keys(variantTypes).length}`);
  console.log(`Variants: ${Object.keys(variants).length}`);
  console.log(`Products: ${products.length}`);
  console.log("Posters: 3");
  console.log("Coupons: 2");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
