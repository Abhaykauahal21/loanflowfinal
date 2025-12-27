const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  tenureMonths: Number,
  income: Number,
  loanType: { type: String, trim: true },
  purpose: { type: String, trim: true },
  interestRate: Number,
  documents: [String], // file paths or URLs
  status: { type: String, enum: ['pending','under_review','approved','rejected'], default: 'pending' },
  adminNote: String
}, { timestamps: true });

module.exports = mongoose.model('Loan', LoanSchema);
