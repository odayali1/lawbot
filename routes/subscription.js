const express = require('express')
const User = require('../models/User')
const { body, validationResult, param } = require('express-validator')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const rateLimit = require('express-rate-limit')

const router = express.Router()

// Rate limiting for subscription operations
const subscriptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many subscription requests, please try again later'
  }
})

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: {
      monthlyQueries: 10,
      basicSupport: true,
      documentAccess: 'limited',
      exportOptions: false,
      prioritySupport: false,
      advancedAnalytics: false
    },
    stripeProductId: null
  },
  basic: {
    name: 'Basic',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: {
      monthlyQueries: 100,
      basicSupport: true,
      documentAccess: 'full',
      exportOptions: true,
      prioritySupport: false,
      advancedAnalytics: false
    },
    stripeProductId: process.env.STRIPE_BASIC_PRODUCT_ID
  },
  premium: {
    name: 'Premium',
    price: 79,
    currency: 'USD',
    interval: 'month',
    features: {
      monthlyQueries: 500,
      basicSupport: true,
      documentAccess: 'full',
      exportOptions: true,
      prioritySupport: true,
      advancedAnalytics: true
    },
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    interval: 'month',
    features: {
      monthlyQueries: -1, // Unlimited
      basicSupport: true,
      documentAccess: 'full',
      exportOptions: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customIntegrations: true,
      dedicatedSupport: true
    },
    stripeProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID
  }
}

// Validation middleware
const validateSubscriptionUpdate = [
  body('plan')
    .isIn(Object.keys(SUBSCRIPTION_PLANS))
    .withMessage('Invalid subscription plan'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string')
]

const validatePaymentMethod = [
  body('paymentMethodId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Payment method ID is required')
]

// Apply rate limiting
router.use(subscriptionRateLimit)

// @route   GET /api/subscription/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan
    }))

    res.json({
      success: true,
      plans
    })

  } catch (error) {
    console.error('Get plans error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans'
    })
  }
})

// @route   GET /api/subscription/current
// @desc    Get current user subscription
// @access  Private
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription usage')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free
    
    // Calculate usage statistics
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const monthlyUsage = {
      queries: user.usage.monthlyQueries || 0,
      limit: currentPlan.features.monthlyQueries,
      remaining: currentPlan.features.monthlyQueries === -1 ? -1 : 
        Math.max(0, currentPlan.features.monthlyQueries - (user.usage.monthlyQueries || 0)),
      resetDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    }

    res.json({
      success: true,
      subscription: {
        ...user.subscription.toObject(),
        plan: {
          id: user.subscription.plan,
          ...currentPlan
        }
      },
      usage: monthlyUsage
    })

  } catch (error) {
    console.error('Get current subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription details'
    })
  }
})

// @route   POST /api/subscription/create-payment-intent
// @desc    Create payment intent for subscription
// @access  Private
router.post('/create-payment-intent', authenticateToken, validateSubscriptionUpdate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { plan } = req.body
    const selectedPlan = SUBSCRIPTION_PLANS[plan]

    if (!selectedPlan || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan or free plan selected'
      })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPlan.price * 100, // Convert to cents
      currency: selectedPlan.currency.toLowerCase(),
      metadata: {
        userId: req.user._id.toString(),
        plan: plan,
        type: 'subscription'
      },
      automatic_payment_methods: {
        enabled: true
      }
    })

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: selectedPlan.price,
      currency: selectedPlan.currency,
      plan: {
        id: plan,
        ...selectedPlan
      }
    })

  } catch (error) {
    console.error('Create payment intent error:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    })
  }
})

// @route   POST /api/subscription/confirm-payment
// @desc    Confirm payment and update subscription
// @access  Private
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      })
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      })
    }

    // Verify the payment belongs to this user
    if (paymentIntent.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Payment verification failed'
      })
    }

    const plan = paymentIntent.metadata.plan
    const selectedPlan = SUBSCRIPTION_PLANS[plan]

    // Update user subscription
    const user = await User.findById(req.user._id)
    
    user.subscription = {
      plan: plan,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
      stripeCustomerId: paymentIntent.customer,
      stripeSubscriptionId: paymentIntent.id,
      paymentHistory: [
        ...(user.subscription.paymentHistory || []),
        {
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          date: new Date(),
          stripePaymentIntentId: paymentIntentId,
          status: 'completed'
        }
      ]
    }

    // Reset monthly usage for paid plans
    user.usage.monthlyQueries = 0
    user.usage.lastReset = new Date()

    await user.save()

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        plan: {
          id: plan,
          ...selectedPlan
        },
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        isActive: user.subscription.isActive
      }
    })

  } catch (error) {
    console.error('Confirm payment error:', error)
    res.status(500).json({
      success: false,
      message: 'Error confirming payment'
    })
  }
})

// @route   POST /api/subscription/upgrade
// @desc    Upgrade subscription plan
// @access  Private
router.post('/upgrade', authenticateToken, validateSubscriptionUpdate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { plan } = req.body
    const user = await User.findById(req.user._id)
    const currentPlan = user.subscription.plan
    const newPlan = SUBSCRIPTION_PLANS[plan]
    const oldPlan = SUBSCRIPTION_PLANS[currentPlan]

    // Validate upgrade path
    if (newPlan.price <= oldPlan.price) {
      return res.status(400).json({
        success: false,
        message: 'Can only upgrade to a higher tier plan'
      })
    }

    // Calculate prorated amount
    const now = new Date()
    const endDate = new Date(user.subscription.endDate)
    const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
    const proratedAmount = Math.round((newPlan.price - oldPlan.price) * (remainingDays / 30))

    if (proratedAmount > 0) {
      // Create payment intent for prorated amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: proratedAmount * 100,
        currency: newPlan.currency.toLowerCase(),
        metadata: {
          userId: req.user._id.toString(),
          plan: plan,
          type: 'upgrade',
          proratedAmount: proratedAmount
        },
        automatic_payment_methods: {
          enabled: true
        }
      })

      res.json({
        success: true,
        requiresPayment: true,
        clientSecret: paymentIntent.client_secret,
        proratedAmount,
        remainingDays,
        newPlan: {
          id: plan,
          ...newPlan
        }
      })
    } else {
      // Free upgrade (shouldn't happen with validation above, but just in case)
      user.subscription.plan = plan
      await user.save()

      res.json({
        success: true,
        requiresPayment: false,
        message: 'Subscription upgraded successfully',
        subscription: {
          plan: {
            id: plan,
            ...newPlan
          }
        }
      })
    }

  } catch (error) {
    console.error('Upgrade subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Error upgrading subscription'
    })
  }
})

// @route   POST /api/subscription/downgrade
// @desc    Downgrade subscription plan
// @access  Private
router.post('/downgrade', authenticateToken, validateSubscriptionUpdate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { plan } = req.body
    const user = await User.findById(req.user._id)
    const newPlan = SUBSCRIPTION_PLANS[plan]

    // Schedule downgrade for end of current billing period
    user.subscription.pendingDowngrade = {
      plan: plan,
      effectiveDate: user.subscription.endDate,
      requestedAt: new Date()
    }

    await user.save()

    res.json({
      success: true,
      message: 'Downgrade scheduled successfully',
      downgrade: {
        newPlan: {
          id: plan,
          ...newPlan
        },
        effectiveDate: user.subscription.endDate,
        currentPlanEndsAt: user.subscription.endDate
      }
    })

  } catch (error) {
    console.error('Downgrade subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Error scheduling downgrade'
    })
  }
})

// @route   POST /api/subscription/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (user.subscription.plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel free subscription'
      })
    }

    // Cancel Stripe subscription if exists
    if (user.subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        })
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError)
      }
    }

    // Schedule cancellation for end of billing period
    user.subscription.cancelledAt = new Date()
    user.subscription.cancelAtPeriodEnd = true
    user.subscription.willCancelAt = user.subscription.endDate

    await user.save()

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancellation: {
        cancelledAt: user.subscription.cancelledAt,
        willCancelAt: user.subscription.willCancelAt,
        accessUntil: user.subscription.endDate
      }
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    })
  }
})

// @route   POST /api/subscription/reactivate
// @desc    Reactivate cancelled subscription
// @access  Private
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user.subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not cancelled'
      })
    }

    // Reactivate Stripe subscription if exists
    if (user.subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
          cancel_at_period_end: false
        })
      } catch (stripeError) {
        console.error('Stripe reactivation error:', stripeError)
      }
    }

    // Remove cancellation
    user.subscription.cancelledAt = undefined
    user.subscription.cancelAtPeriodEnd = false
    user.subscription.willCancelAt = undefined

    await user.save()

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: {
        plan: user.subscription.plan,
        isActive: user.subscription.isActive,
        endDate: user.subscription.endDate
      }
    })

  } catch (error) {
    console.error('Reactivate subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Error reactivating subscription'
    })
  }
})

// @route   GET /api/subscription/payment-history
// @desc    Get payment history
// @access  Private
router.get('/payment-history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    
    const user = await User.findById(req.user._id).select('subscription.paymentHistory')
    
    if (!user || !user.subscription.paymentHistory) {
      return res.json({
        success: true,
        payments: [],
        pagination: {
          current: 1,
          pages: 0,
          total: 0,
          limit: parseInt(limit)
        }
      })
    }

    const payments = user.subscription.paymentHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice((page - 1) * limit, page * limit)

    res.json({
      success: true,
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(user.subscription.paymentHistory.length / limit),
        total: user.subscription.paymentHistory.length,
        limit: parseInt(limit)
      }
    })

  } catch (error) {
    console.error('Get payment history error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    })
  }
})

// @route   POST /api/subscription/webhook
// @desc    Handle Stripe webhooks
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log('Payment succeeded:', paymentIntent.id)
      break

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      console.log('Payment failed:', failedPayment.id)
      // Handle failed payment (notify user, etc.)
      break

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object
      console.log('Subscription updated:', updatedSubscription.id)
      break

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object
      console.log('Subscription deleted:', deletedSubscription.id)
      // Handle subscription cancellation
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
    }

    res.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({
      success: false,
      message: 'Webhook processing error'
    })
  }
})

// @route   GET /api/subscription/usage
// @desc    Get detailed usage statistics
// @access  Private
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription usage')
    const currentPlan = SUBSCRIPTION_PLANS[user.subscription.plan] || SUBSCRIPTION_PLANS.free
    
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    // Calculate usage statistics
    const usage = {
      current: {
        queries: user.usage.monthlyQueries || 0,
        limit: currentPlan.features.monthlyQueries,
        percentage: currentPlan.features.monthlyQueries === -1 ? 0 : 
          Math.round(((user.usage.monthlyQueries || 0) / currentPlan.features.monthlyQueries) * 100),
        remaining: currentPlan.features.monthlyQueries === -1 ? -1 : 
          Math.max(0, currentPlan.features.monthlyQueries - (user.usage.monthlyQueries || 0))
      },
      history: {
        lastMonth: user.usage.lastMonthQueries || 0,
        total: user.usage.totalQueries || 0
      },
      resetDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
      plan: {
        id: user.subscription.plan,
        name: currentPlan.name,
        features: currentPlan.features
      }
    }

    res.json({
      success: true,
      usage
    })

  } catch (error) {
    console.error('Get usage error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching usage statistics'
    })
  }
})

module.exports = router