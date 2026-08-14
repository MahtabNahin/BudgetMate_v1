const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

exports.register = async (req, res) => {
  try {
    // Role is intentionally NOT accepted from the client.
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    // Hash the password before storing it.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Every account created through registration is a normal user.
    // Admin accounts must be created/managed separately.
    const finalRole = 'user';

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, finalRole]
    );

    const token = jwt.sign(
      {
        id: result.insertId,
        role: finalRole
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role: finalRole
      }
    });

  } catch (err) {
    console.error('Registration error:', err);

    res.status(500).json({
      message: 'Server error during registration'
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = rows[0];

    // Compare entered password with the stored bcrypt hash.
    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // The role comes from the database.
    // Therefore your existing admin account will still
    // receive role = 'admin'.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);

    res.status(500).json({
      message: 'Server error during login'
    });
  }
};


exports.getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Get user error:', err);

    res.status(500).json({
      message: 'Server error'
    });
  }
};