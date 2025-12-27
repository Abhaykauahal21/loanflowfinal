const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Loan = require('../models/Loan');
const { generateEmiSchedule } = require('../utils/emi');

// Get user's loans
router.get('/my-loans', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ type: 'server_error', message: 'Error fetching loans', status: 500 });
  }
});

// Get user's dashboard statistics
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [statusStats, amountStats, monthlyStats] = await Promise.all([
      // Get loan count by status
      Loan.aggregate([
        { $match: { user: userId } },
        { 
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),

      // Get amount statistics
      Loan.aggregate([
        { 
          $match: { 
            user: userId,
            status: 'approved'
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Get monthly statistics for the last 6 months
      Loan.aggregate([
        {
          $match: {
            user: userId,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            approved: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
              }
            },
            rejected: {
              $sum: {
                $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Process status stats
    const loansByStatus = statusStats.reduce((acc, stat) => {
      acc[stat._id.toLowerCase()] = stat.count;
      acc.total = (acc.total || 0) + stat.count;
      return acc;
    }, {});

    // Process amount stats
    const amountData = amountStats[0] || { totalAmount: 0, avgAmount: 0 };

    res.json({
      loans: {
        total: loansByStatus.total || 0,
        approved: loansByStatus.approved || 0,
        pending: loansByStatus.pending || 0,
        rejected: loansByStatus.rejected || 0
      },
      amounts: {
        total: amountData.totalAmount || 0,
        average: amountData.avgAmount || 0
      },
      monthlyStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only support jpeg, jpg, png, pdf'));
  }
});

// Apply for loan (with document upload)
router.post('/apply', auth, upload.array('documents', 3), async (req, res) => {
  try {
    const { amount, tenureMonths, income, loanType, purpose } = req.body;
    
    const loan = new Loan({
      user: req.user.id,
      amount: Number(amount),
      tenureMonths: Number(tenureMonths),
      income: Number(income),
      loanType: loanType ? String(loanType).trim().toLowerCase() : undefined,
      purpose: purpose ? String(purpose).trim() : undefined,
      documents: req.files.map(file => file.filename),
      status: 'pending'
    });

    await loan.save();
    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get user's loans
router.get('/my', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

router.get('/:loanId/emis', auth, async (req, res) => {
  try {
    const { loanId } = req.params;

    if (!mongoose.isValidObjectId(loanId)) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Invalid loanId',
        status: 400,
      });
    }

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({
        type: 'not_found',
        message: 'Loan not found',
        status: 404,
      });
    }

    if (req.user.role !== 'admin' && loan.user?.toString() !== req.user.id) {
      return res.status(403).json({
        type: 'forbidden',
        message: 'Not authorized',
        status: 403,
      });
    }

    const annualRatePercent = Number(
      loan.interestRate ?? process.env.DEFAULT_ANNUAL_INTEREST_RATE ?? 8.5
    );

    const { monthlyEMI, totalInterest, schedule } = generateEmiSchedule({
      principal: loan.amount,
      annualRatePercent,
      months: loan.tenureMonths,
    });

    res.json({
      loanId: loan._id.toString(),
      monthlyEMI,
      totalInterest,
      schedule,
    });
  } catch (err) {
    const status = Number(err?.status || 500);
    const message = err?.message || 'Server error';
    res.status(status).json({
      type: status >= 500 ? 'server_error' : 'validation_error',
      message,
      status,
    });
  }
});

// Get specific loan details
router.get('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!loan) {
      return res.status(404).json({ type: 'not_found', message: 'Loan not found', status: 404 });
    }

    const loanUserId = loan.user?._id ? loan.user._id.toString() : loan.user?.toString();
    if (!loanUserId) {
      return res.status(500).json({ type: 'server_error', message: 'Loan user missing', status: 500 });
    }

    if (req.user.role !== 'admin' && loanUserId !== req.user.id) {
      return res.status(403).json({ type: 'forbidden', message: 'Not authorized', status: 403 });
    }

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

module.exports = router;
