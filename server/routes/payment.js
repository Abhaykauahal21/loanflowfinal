const router = require('express').Router();
const mongoose = require('mongoose');
const { auth, adminOnly } = require('../middleware/auth');
const Payment = require('../models/Payment');

// Create a new payment (user-initiated)
router.post('/', auth, async (req, res) => {
  try {
    const { loanId, amount, paymentMethod, transactionId, remarks } = req.body;
    if (!loanId || !amount || !paymentMethod) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'loanId, amount and paymentMethod are required',
        status: 400,
      });
    }

    if (!mongoose.isValidObjectId(loanId)) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Invalid loanId',
        status: 400,
      });
    }

    const payment = await Payment.create({
      loanId: new mongoose.Types.ObjectId(loanId),
      userId: new mongoose.Types.ObjectId(req.user.id),
      amount: Number(amount),
      paymentMethod,
      transactionId,
      remarks,
      status: 'pending',
    });

    res.json(payment);
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Get payments for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Invalid userId',
        status: 400,
      });
    }

    if (req.user.id !== userId) {
      return res.status(403).json({
        type: 'forbidden',
        message: 'Not authorized',
        status: 403,
      });
    }

    const payments = await Payment.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch user payments error:', err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

// Update payment status (admin only)
router.put('/:id/status', [auth, adminOnly], async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const allowed = ['pending', 'completed', 'failed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Invalid status',
        status: 400,
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        type: 'not_found',
        message: 'Payment not found',
        status: 404,
      });
    }

    payment.status = status;
    if (remarks) payment.remarks = remarks;
    await payment.save();

    res.json(payment);
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ type: 'server_error', message: 'Server error', status: 500 });
  }
});

module.exports = router;
