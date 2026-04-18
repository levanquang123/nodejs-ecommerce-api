const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'], 
        trim: true
    },
    subCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory', 
        required: [true, 'Subcategory ID is required']
    }
},{ timestamps: true });

brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ subCategoryId: 1 });

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
