-- BudgetMate database schema
-- Import this in phpMyAdmin (XAMPP) or run via MySQL CLI

CREATE DATABASE IF NOT EXISTS budgetmate;
USE budgetmate;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories (per-user, but admin can create global/default ones with user_id NULL)
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  note VARCHAR(255),
  txn_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Budgets (per category, per month)
CREATE TABLE budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- format: 'YYYY-MM'
  limit_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_budget (user_id, category_id, month_year)
);

-- Goals
CREATE TABLE goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_saved DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  status ENUM('active', 'completed', 'abandoned') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recurring transactions
CREATE TABLE recurring_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  day_of_month INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_confirmed DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Streaks (budget adherence per category)
CREATE TABLE streaks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_success_month VARCHAR(7) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_streak (user_id, category_id)
);

-- Badges
CREATE TABLE badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_type VARCHAR(100) NOT NULL,
  earned_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default categories (global, user_id NULL)

INSERT INTO categories (user_id, name, type) VALUES

-- =========================
-- INCOME CATEGORIES
-- =========================
(NULL, 'Salary', 'income'),
(NULL, 'Tuition Fees', 'income'),
(NULL, 'Freelancing', 'income'),
(NULL, 'Business', 'income'),
(NULL, 'Gift', 'income'),
(NULL, 'Investment', 'income'),
(NULL, 'Interest', 'income'),
(NULL, 'Other Income', 'income'),

-- =========================
-- EXPENSE CATEGORIES
-- =========================
(NULL, 'Food', 'expense'),
(NULL, 'Entertainment', 'expense'),
(NULL, 'Bills', 'expense'),
(NULL, 'Shopping', 'expense'),
(NULL, 'Gadgets', 'expense'),
(NULL, 'Transport', 'expense'),
(NULL, 'Education', 'expense'),
(NULL, 'Rent', 'expense'),
(NULL, 'Health', 'expense'),
(NULL, 'Subscriptions', 'expense'),
(NULL, 'Personal', 'expense'),
(NULL, 'Travel', 'expense'),
(NULL, 'Other Expense', 'expense');