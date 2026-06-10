const express = require('express');
const prisma = require('../../lib/prisma');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

async function renderPath(req, res, type, viewName) {
  const path = await prisma.learningPath.findUnique({
    where: { type },
    include: {
      steps: {
        where: { isArchived: false, isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!path) {
    return res.status(404).render('pages/error', {
      title: 'مسیر آموزشی',
      message: 'مسیر آموزشی هنوز تنظیم نشده است.',
      code: 404,
    });
  }
  let progressMap = {};
  if (req.user) {
    const prog = await prisma.userStepProgress.findMany({
      where: { userId: req.user.id, stepId: { in: path.steps.map((s) => s.id) } },
    });
    progressMap = Object.fromEntries(prog.map((p) => [p.stepId, p]));
  }
  const stepId = req.query.step || path.steps[0]?.id;
  const activeStep = path.steps.find((s) => s.id === stepId) || path.steps[0];
  res.render(viewName, {
    title: path.title,
    path,
    steps: path.steps.map((s) => ({
      ...s,
      progress: progressMap[s.id]?.percentWatched || 0,
      completed: progressMap[s.id]?.completed || false,
    })),
    activeStep,
    activeProgress: activeStep ? progressMap[activeStep.id] : null,
  });
}

router.get('/learn/zero-to-hundred', (req, res) =>
  renderPath(req, res, 'SEVEN_STEPS', 'pages/learn-seven')
);
router.get('/learn/metatrader', (req, res) =>
  renderPath(req, res, 'TEN_STEPS', 'pages/learn-ten')
);

router.post('/learn/progress', requireAuth, async (req, res) => {
  const { stepId, percentWatched, completed } = req.body;
  const pct = parseInt(percentWatched || '0', 10);
  const done = completed === 'true' || completed === true || pct >= 80;
  await prisma.userStepProgress.upsert({
    where: { userId_stepId: { userId: req.user.id, stepId } },
    create: {
      userId: req.user.id,
      stepId,
      percentWatched: pct,
      completed: done,
    },
    update: { percentWatched: pct, completed: done },
  });
  res.json({ ok: true, completed: done });
});

module.exports = router;
