const mongoose = require('mongoose');

const variantImageSchema = new mongoose.Schema(
    {
        image: {
            type: Number,
            required: true
        },
        url: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);

const productVariantAttributeSchema = new mongoose.Schema(
    {
        variantTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VariantType',
            required: true
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: true
        }
    },
    { _id: false }
);

const productVariantSchema = new mongoose.Schema(
    {
        sku: {
            type: String,
            required: true,
            trim: true
        },
        attributes: {
            type: [productVariantAttributeSchema],
            default: []
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        offerPrice: {
            type: Number,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        images: {
            type: [variantImageSchema],
            default: []
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { _id: true }
);

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number
    },
    proCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    proSubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: true
    },
    proBrandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand'
    },
    proVariantTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VariantType'
    },
    proVariantId: [String],
    images: [{
        image: {
            type: Number,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    variants: {
        type: [productVariantSchema],
        default: []
    },
    reviewSummary: {
        ratingAverage: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        reviewCount: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
