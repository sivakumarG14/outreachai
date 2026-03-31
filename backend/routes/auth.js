const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });

  res.json({ token });
});

module.exports = router;
