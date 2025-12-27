const mongoose = require('mongoose');

const InterestRateCategorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, unique: true, trim: true, lowercase: true },
    annualRatePercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterestRateCategory', InterestRateCategorySchema);

