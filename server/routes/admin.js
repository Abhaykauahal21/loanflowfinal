const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const Loan = require('../models/Loan');
const InterestRateCategory = require('../models/InterestRateCategory');
const User = require('../models/User');

// Get all loans (admin only)
router.get('/loans', [auth, adminOnly], async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Search by user email or name if provided
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
      const userIds = users.map(user => user._id);
      query.user = { $in: userIds };
    }

    const loans = await Loan.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Update loan status (admin only)
router.put('/loans/:id/status', [auth, adminOnly], async (req, res) => {
  try {
    const { status, adminNote, loanType, interestRate } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ type: 'not_found', message: 'Loan not found', status: 404 });
    }

    const prevStatus = loan.status;

    loan.status = status;
    if (adminNote) {
      loan.adminNote = adminNote;
    }
    if (loanType) {
      loan.loanType = String(loanType).trim().toLowerCase();
    }

    if (Number.isFinite(Number(interestRate))) {
      loan.interestRate = Number(interestRate);
    } else if (status === 'approved' && prevStatus !== 'approved' && loan.interestRate == null) {
      const categoryKey = loan.loanType ? String(loan.loanType).trim().toLowerCase() : '';
      if (categoryKey) {
        const cat = await InterestRateCategory.findOne({ category: categoryKey });
        if (cat) {
          loan.interestRate = cat.annualRatePercent;
        }
      }

      if (loan.interestRate == null) {
        loan.interestRate = Number(process.env.DEFAULT_ANNUAL_INTEREST_RATE ?? 8.5);
      }
    }

    await loan.save();

    const io = req.app.get('io');
    if (io) {
      const userId = loan.user?.toString();
      const payload = {
        loanId: loan._id.toString(),
        userId,
        status: loan.status,
        adminNote: loan.adminNote,
        updatedAt: loan.updatedAt,
      };

      io.to('role:admin').emit('loan:statusChanged', payload);
      if (userId) {
        io.to(`user:${userId}`).emit('loan:statusChanged', payload);
      }
    }

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

router.get('/interest-rates', [auth, adminOnly], async (req, res) => {
  try {
    const rates = await InterestRateCategory.find().sort({ category: 1 });
    res.json(rates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

router.put('/interest-rates/:category', [auth, adminOnly], async (req, res) => {
  try {
    const category = String(req.params.category || '').trim().toLowerCase();
    const annualRatePercent = Number(req.body?.annualRatePercent);

    if (!category) {
      return res.status(400).json({ type: 'validation_error', message: 'Category is required', status: 400 });
    }
    if (!Number.isFinite(annualRatePercent)) {
      return res.status(400).json({ type: 'validation_error', message: 'annualRatePercent must be a number', status: 400 });
    }
    if (annualRatePercent < 0 || annualRatePercent > 100) {
      return res.status(400).json({ type: 'validation_error', message: 'annualRatePercent must be between 0 and 100', status: 400 });
    }

    const updated = await InterestRateCategory.findOneAndUpdate(
      { category },
      { $set: { annualRatePercent } },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

router.delete('/interest-rates/:category', [auth, adminOnly], async (req, res) => {
  try {
    const category = String(req.params.category || '').trim().toLowerCase();
    if (!category) {
      return res.status(400).json({ type: 'validation_error', message: 'Category is required', status: 400 });
    }

    await InterestRateCategory.deleteOne({ category });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get user profiles (admin only)
router.get('/users', [auth, adminOnly], async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get user loan statistics (admin only)
router.get('/stats', [auth, adminOnly], async (req, res) => {
  try {
    const totalLoans = await Loan.countDocuments();
    const pendingLoans = await Loan.countDocuments({ status: 'pending' });
    const approvedLoans = await Loan.countDocuments({ status: 'approved' });
    const rejectedLoans = await Loan.countDocuments({ status: 'rejected' });
    const totalUsers = await User.countDocuments({ role: 'user' });

    const totalAmount = await Loan.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      totalLoans,
      pendingLoans,
      approvedLoans,
      rejectedLoans,
      totalUsers,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get analytics data (admin only)
router.get('/analytics', [auth, adminOnly], async (req, res) => {
  try {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();

    // Get daily applications data
    const dailyApplications = await Promise.all(
      last7Days.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const [applications, approved, rejected] = await Promise.all([
          Loan.countDocuments({
            createdAt: { $gte: date, $lt: nextDate }
          }),
          Loan.countDocuments({
            status: 'approved',
            updatedAt: { $gte: date, $lt: nextDate }
          }),
          Loan.countDocuments({
            status: 'rejected',
            updatedAt: { $gte: date, $lt: nextDate }
          })
        ]);

        return {
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          applications,
          approved,
          rejected,
          rate: applications ? Math.round((approved / applications) * 100) : 0
        };
      })
    );

    // Get monthly statistics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyApproved = await Loan.aggregate([
      {
        $match: {
          status: 'approved',
          updatedAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get loan purpose distribution
    const distribution = await Loan.aggregate([
      {
        $match: { status: 'approved' }
      },
      {
        $group: {
          _id: '$purpose',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      trends: dailyApplications,
      approvalRates: dailyApplications.map(({ name, rate }) => ({ name, rate })),
      monthlyStats: {
        approvedAmount: monthlyApproved[0]?.totalAmount || 0,
        distribution
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get active loan users (admin only)
router.get('/active-users', [auth, adminOnly], async (req, res) => {
  try {
    // Get users with active loans
    const activeUsers = await User.aggregate([
      {
        $lookup: {
          from: 'loans',
          localField: '_id',
          foreignField: 'user',
          as: 'loans'
        }
      },
      {
        $match: {
          'loans.status': 'approved'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          activeLoans: {
            $size: {
              $filter: {
                input: '$loans',
                as: 'loan',
                cond: { $eq: ['$$loan.status', 'approved'] }
              }
            }
          },
          totalLoanAmount: {
            $sum: '$loans.amount'
          }
        }
      },
      {
        $sort: { activeLoans: -1 }
      }
    ]);

    res.json(activeUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

module.exports = router;
