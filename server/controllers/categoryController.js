const pool = require('../config/db');

exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL ORDER BY type, name',
      [req.user.id]
    );

    const unique = new Map();
    const getKey = (name) => {
      const normalized = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      if (['other', 'others', 'other expense', 'other expenses'].includes(normalized)) {
        return 'other-expense';
      }

      return normalized.replace(/[^a-z0-9]+/g, '');
    };

    rows.forEach((category) => {
      const key = `${category.type}:${getKey(category.name)}`;
      const existing = unique.get(key);

      if (!existing || (existing.user_id == null && category.user_id != null)) {
        unique.set(key, category);
      }
    });

    const result = Array.from(unique.values()).map((category) => {
      const normalized = String(category.name || '').trim().toLowerCase();
      if (['other', 'others', 'other expense', 'other expenses'].includes(normalized)) {
        return { ...category, name: 'Other Expense' };
      }
      return category;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type are required' });

    const [result] = await pool.query(
      'INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)',
      [req.user.id, name, type]
    );
    res.status(201).json({ id: result.insertId, name, type, user_id: req.user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });

    const category = rows[0];
    if (category.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this category' });
    }

    await pool.query('UPDATE categories SET name = ?, type = ? WHERE id = ?', [name, type, id]);
    res.json({ id, name, type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });

    const category = rows[0];
    if (category.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this category' });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
