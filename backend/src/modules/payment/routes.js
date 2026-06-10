const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const config = require('../../config');
const { generateToken } = require('../../lib/helpers');

const router = express.Router();

async function zarinpalRequest(amount, callbackUrl, description) {
  const merchant = config.zarinpal.merchant;
  if (!merchant) {
    return { ok: false, dev: true, authority: 'DEV-' + generateToken(8) };
  }
  const base = config.zarinpal.sandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
    : 'https://api.zarinpal.com/pg/v4/payment/request.json';
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: merchant,
      amount,
      callback_url: callbackUrl,
      description,
    }),
  });
  const data = await res.json();
  if (data.data?.authority) return { ok: true, authority: data.data.authority };
  if (config.zarinpal.sandbox || !merchant) {
    console.warn('[zarinpal] sandbox fallback:', data.errors?.message || data);
    return { ok: false, dev: true, authority: 'DEV-' + generateToken(8) };
  }
  throw new Error(data.errors?.message || 'خطا در اتصال زرین‌پال');
}

router.get('/payment/zarinpal', requireAuth, async (req, res) => {
  const amount = parseInt(req.query.amount || '0', 10);
  if (amount < 1000) return res.redirect('/cart');
  const callbackUrl = `${config.appUrl}/payment/zarinpal/verify`;
  try {
    const result = await zarinpalRequest(amount, callbackUrl, 'پرداخت لیموترید');
    req.session.payment = { authority: result.authority, amount, userId: req.user.id };
    if (result.dev) {
      return res.redirect(`/payment/zarinpal/verify?Authority=${result.authority}&Status=OK`);
    }
    const gateway = config.zarinpal.sandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay/'
      : 'https://www.zarinpal.com/pg/StartPay/';
    res.redirect(gateway + result.authority);
  } catch (e) {
    res.redirect('/cart?error=payment');
  }
});

router.get('/payment/zarinpal/verify', requireAuth, async (req, res) => {
  const pay = req.session.payment;
  if (!pay || req.query.Authority !== pay.authority) {
    return res.redirect('/cart?error=verify');
  }
  if (req.query.Status !== 'OK') {
    return res.redirect('/cart?error=cancelled');
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount: pay.amount,
        status: 'SUCCESS',
        trackingCode: req.query.Authority,
        description: 'پرداخت زرین‌پال',
      },
    });
    const cart = await tx.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true },
    });
    if (cart?.items?.length) {
      for (const item of cart.items) {
        if (item.itemType === 'subscription') {
          const end = new Date();
          end.setDate(end.getDate() + 7);
          await tx.subscription.create({
            data: {
              userId: req.user.id,
              startDate: new Date(),
              endDate: end,
              amount: item.price,
              status: 'ACTIVE',
            },
          });
        } else if (item.packageId) {
          await tx.userPackage.create({
            data: { userId: req.user.id, packageId: item.packageId },
          });
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  });
  delete req.session.payment;
  res.redirect('/dashboard?paid=1');
});

module.exports = router;
