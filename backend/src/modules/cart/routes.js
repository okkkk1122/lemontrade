const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');
const { formatToman } = require('../../lib/helpers');
const config = require('../../config');

const router = express.Router();

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { package: true } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { package: true } } },
    });
  }
  return cart;
}

router.get('/cart', requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const settings = res.locals.settings;
  const weeklyPrice = settings.weeklySubscriptionPrice || config.subscription.weeklyPrice;
  let items = cart.items.map((i) => ({
    ...i,
    title: i.package?.title || 'اشتراک هفتگی',
  }));
  if (req.query.need === 'subscription' && !items.some((i) => i.itemType === 'subscription')) {
    items = [{ id: 'sub', itemType: 'subscription', title: 'اشتراک هفتگی', price: weeklyPrice, quantity: 1 }];
  }
  const total = items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  res.render('pages/cart', { title: 'سبد خرید', items, total, formatToman });
});

router.post('/cart/add', requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  if (req.body.type === 'subscription') {
    const price = res.locals.settings?.weeklySubscriptionPrice || config.subscription.weeklyPrice;
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, itemType: 'subscription' } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, itemType: 'subscription', price, quantity: 1 },
    });
  } else if (req.body.packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: req.body.packageId } });
    if (pkg) {
      await prisma.cartItem.create({
        data: { cartId: cart.id, itemType: 'package', packageId: pkg.id, price: pkg.price, quantity: 1 },
      });
    }
  }
  res.redirect('/cart');
});

router.post('/cart/remove/:id', requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await prisma.cartItem.deleteMany({ where: { id: req.params.id, cartId: cart.id } });
  res.redirect('/cart');
});

router.post('/cart/checkout', requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (total <= 0) return res.redirect('/cart');

  if (req.body.method === 'wallet') {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet || wallet.balance < total) {
      return res.redirect('/cart?error=insufficient');
    }
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: total } } });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PACKAGE',
          amount: -total,
          status: 'SUCCESS',
          description: 'خرید از سبد',
        },
      });
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
          await tx.package.update({
            where: { id: item.packageId },
            data: { salesCount: { increment: 1 } },
          });
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
    return res.redirect('/dashboard?paid=1');
  }

  res.redirect(`/payment/zarinpal?amount=${total}`);
});

module.exports = router;
