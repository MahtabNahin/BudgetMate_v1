import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import './Transactions.css';
import { useToast } from '../context/ToastContext';
import { notifyDataChanged } from '../context/AlertsContext';


// =====================================================
// CATEGORY GROUPS
// =====================================================

const incomeCategories = [
  {
    name: 'Salary',
    icon: '💼',
    keywords: ['salary'],
  },
  {
    name: 'Tuition Fees',
    icon: '🎓',
    keywords: ['tuition', 'tution'],
  },
  {
    name: 'Freelancing',
    icon: '💻',
    keywords: ['freelance', 'freelancing'],
  },
  {
    name: 'Business',
    icon: '🏪',
    keywords: ['business'],
  },
  {
    name: 'Gift',
    icon: '🎁',
    keywords: ['gift'],
  },
  {
    name: 'Investment',
    icon: '💵',
    keywords: ['investment', 'investments'],
  },
  {
    name: 'Interest',
    icon: '🏦',
    keywords: ['interest'],
  },
  {
    name: 'Other Income',
    icon: '➕',
    keywords: ['other income'],
  },
];


const expenseCategories = [
  {
    name: 'Food',
    icon: '🍔',
    keywords: ['food', 'restaurant', 'grocery', 'groceries'],
  },
  {
    name: 'Entertainment',
    icon: '🎬',
    keywords: ['entertainment', 'movie', 'game', 'games'],
  },
  {
    name: 'Bills',
    icon: '🏠',
    keywords: ['bill', 'bills', 'electricity', 'water', 'gas', 'internet'],
  },
  {
    name: 'Shopping',
    icon: '🛍️',
    keywords: ['shopping', 'clothes', 'clothing'],
  },
  {
    name: 'Gadgets',
    icon: '💻',
    keywords: ['gadget', 'gadgets', 'electronics', 'phone', 'laptop'],
  },
  {
    name: 'Transport',
    icon: '🚗',
    keywords: ['transport', 'bus', 'uber', 'rickshaw', 'fuel', 'taxi'],
  },
  {
    name: 'Education',
    icon: '📚',
    keywords: ['education', 'book', 'books', 'course'],
  },
  {
    name: 'Rent',
    icon: '🏠',
    keywords: ['rent', 'hostel'],
  },
  {
    name: 'Health',
    icon: '💊',
    keywords: ['health', 'medicine', 'medical', 'doctor'],
  },
  {
    name: 'Subscriptions',
    icon: '☕',
    keywords: ['subscription', 'subscriptions', 'netflix', 'spotify'],
  },
  {
    name: 'Personal',
    icon: '🏋️',
    keywords: ['personal', 'gym', 'haircut'],
  },
  {
    name: 'Travel',
    icon: '✈️',
    keywords: ['travel', 'trip', 'hotel'],
  },
  {
    name: 'Other Expense',
    icon: '➕',
    keywords: ['other expense'],
  },
];


export default function Transactions() {

  // ===================================================
  // STATE
  // ===================================================

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    category_id: '',
    type: 'expense',
    amount: '',
    note: '',
    txn_date: new Date().toISOString().slice(0, 10),
  });

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [showForm, setShowForm] = useState(true);
  const showToast = useToast();


  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadTransactions = () => {
    api
      .get('/transactions')
      .then((res) => setTransactions(res.data))
      .catch((err) => {
        console.error('Failed to load transactions:', err);
      });
  };


  useEffect(() => {

    loadTransactions();

    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => {
        console.error('Failed to load categories:', err);
      });

  }, []);


  // ===================================================
  // FORM HANDLING
  // ===================================================

  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  // When user changes Income / Expense
  const handleTypeChange = (type) => {

    setForm((previous) => ({
      ...previous,
      type,
      category_id: '',
    }));

  };


  // ===================================================
  // CATEGORY MATCHING
  // ===================================================

  const getCategoryGroup = (categoryName, type) => {

    const name = categoryName.toLowerCase().trim();

    const groups =
      type === 'income'
        ? incomeCategories
        : expenseCategories;

    return groups.find((group) =>
      group.keywords.some((keyword) =>
        name.includes(keyword)
      )
    );

  };


  const availableCategoryGroups =
    form.type === 'income'
      ? incomeCategories
      : expenseCategories;


  // ===================================================
  // CATEGORY SELECTION
  // ===================================================

  const handleCategorySelect = (group) => {

    const matchingCategory = categories.find((category) => {

      const categoryName =
        category.name.toLowerCase().trim();

      return group.keywords.some((keyword) =>
        categoryName.includes(keyword)
      );

    });


    if (matchingCategory) {

      setForm((previous) => ({
        ...previous,
        category_id: matchingCategory.id,
      }));

    } else {

      showToast(`The "${group.name}" category is not available.`, 'error');

    }

  };


  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!form.category_id) {

      showToast('Please select a category.', 'error');

      return;

    }


    try {

      if (editingId) {

        await api.put(
          `/transactions/${editingId}`,
          form
        );

      } else {

        await api.post(
          '/transactions',
          form
        );

      }


      const wasEditing = Boolean(editingId);
      resetForm();
      loadTransactions();
      notifyDataChanged();
      showToast(wasEditing ? 'Transaction updated ✓' : `${form.type === 'expense' ? 'Expense' : 'Income'} added successfully ✓`);

    } catch (error) {

      console.error(
        'Transaction save failed:',
        error
      );

      showToast('Unable to save transaction. Please try again.', 'error');

    }

  };


  // ===================================================
  // RESET FORM
  // ===================================================

  const resetForm = () => {

    setForm({
      category_id: '',
      type: 'expense',
      amount: '',
      note: '',
      txn_date: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setEditingId(null);

  };


  // ===================================================
  // EDIT
  // ===================================================

  const handleEdit = (transaction) => {

    setEditingId(transaction.id);

    setForm({
      category_id: transaction.category_id,
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note || '',
      txn_date: transaction.txn_date.slice(0, 10),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  };


  // ===================================================
  // DELETE
  // ===================================================

  const handleDelete = async (id) => {

    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction?'
    );

    if (!confirmed) return;


    try {

      await api.delete(
        `/transactions/${id}`
      );

      loadTransactions();
      notifyDataChanged();
      showToast('Transaction deleted ✓');

    } catch (error) {

      console.error(
        'Delete failed:',
        error
      );

      showToast('Unable to delete transaction.', 'error');

    }

  };


  // ===================================================
  // FILTER TRANSACTIONS
  // ===================================================

  const filteredTransactions = useMemo(() => {

    return transactions.filter((transaction) => {

      const matchesType =
        filterType === 'all' ||
        transaction.type === filterType;


      const searchText =
        `${transaction.category_name || ''} ${transaction.note || ''}`
          .toLowerCase();


      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );


      return matchesType && matchesSearch;

    });

  }, [
    transactions,
    filterType,
    search,
  ]);


  // ===================================================
  // TOTALS
  // ===================================================

  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );


  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );


  // ===================================================
  // SELECTED CATEGORY
  // ===================================================

  const selectedCategory = categories.find(
    (category) =>
      String(category.id) ===
      String(form.category_id)
  );


  const selectedCategoryGroup =
    selectedCategory
      ? getCategoryGroup(
          selectedCategory.name,
          form.type
        )
      : null;


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div className="transactions-page">


      {/* =============================================
          HEADER
      ============================================= */}

      <div className="transactions-header">

        <div>

          <h1>Transactions</h1>

          <p>
            Manage your income and expenses in one place.
          </p>

        </div>


        <button
          className="add-transaction-btn"
          onClick={() =>
            setShowForm(!showForm)
          }
        >
          {showForm ? '× Close' : '+ Add Transaction'}
        </button>

      </div>


      {/* =============================================
          SUMMARY
      ============================================= */}

      <div className="transaction-summary">

        <div className="transaction-stat income-stat">

          <div className="stat-icon">
            ↗
          </div>

          <div>

            <span>Total Income</span>

            <strong>
              ৳{totalIncome.toLocaleString()}
            </strong>

          </div>

        </div>


        <div className="transaction-stat expense-stat">

          <div className="stat-icon">
            ↘
          </div>

          <div>

            <span>Total Expenses</span>

            <strong>
              ৳{totalExpense.toLocaleString()}
            </strong>

          </div>

        </div>


        <div className="transaction-stat balance-stat">

          <div className="stat-icon">
            💰
          </div>

          <div>

            <span>Net Balance</span>

            <strong
              className={
                totalIncome - totalExpense >= 0
                  ? 'positive-text'
                  : 'negative-text'
              }
            >
              ৳{(
                totalIncome - totalExpense
              ).toLocaleString()}
            </strong>

          </div>

        </div>

      </div>


      {/* =============================================
          TRANSACTION FORM
      ============================================= */}

      {showForm && (

        <div className="transaction-form-card">

          <div className="form-header">

            <div>

              <h2>
                {editingId
                  ? 'Edit Transaction'
                  : 'Add Transaction'}
              </h2>

              <p>
                Record your money movement.
              </p>

            </div>

          </div>


          {/* INCOME / EXPENSE TOGGLE */}

          <div className="type-toggle">

            <button
              type="button"
              className={
                form.type === 'income'
                  ? 'type-btn income-active'
                  : 'type-btn'
              }
              onClick={() =>
                handleTypeChange('income')
              }
            >
              <span>🟢</span>
              Income
            </button>


            <button
              type="button"
              className={
                form.type === 'expense'
                  ? 'type-btn expense-active'
                  : 'type-btn'
              }
              onClick={() =>
                handleTypeChange('expense')
              }
            >
              <span>🔴</span>
              Expense
            </button>

          </div>


          {/* CATEGORY SECTION */}

          <div className="category-section">

            <div className="section-label">

              <div>

                <h3>
                  {form.type === 'income'
                    ? 'Income Categories'
                    : 'Expense Categories'}
                </h3>

                <p>
                  Select where this money came from
                  or where it was spent.
                </p>

              </div>

            </div>


            <div className="category-grid">

              {availableCategoryGroups.map(
                (group) => {

                  const matchingCategory =
                    categories.find((category) => {

                      const categoryName =
                        category.name
                          .toLowerCase()
                          .trim();

                      return group.keywords.some(
                        (keyword) =>
                          categoryName.includes(
                            keyword
                          )
                      );

                    });


                  const isSelected =
                    matchingCategory &&
                    String(
                      form.category_id
                    ) ===
                      String(
                        matchingCategory.id
                      );


                  return (

                    <button
                      type="button"
                      key={group.name}
                      className={
                        `category-button ${
                          isSelected
                            ? 'selected-category'
                            : ''
                        }`
                      }
                      onClick={() =>
                        handleCategorySelect(group)
                      }
                    >

                      <span className="category-icon">
                        {group.icon}
                      </span>

                      <span>
                        {group.name}
                      </span>

                    </button>

                  );

                }
              )}

            </div>


            {/* SELECTED CATEGORY */}

            {selectedCategory && (

              <div className="selected-category-info">

                <span>
                  Selected:
                </span>

                <strong>

                  {selectedCategoryGroup?.icon || '📁'}
                  {' '}
                  {selectedCategory.name}

                </strong>

              </div>

            )}

          </div>


          {/* FORM DETAILS */}

          <form
            className="transaction-details-form"
            onSubmit={handleSubmit}
          >

            <div className="form-row">

              <div className="form-field">

                <label>
                  Amount
                </label>

                <div className="amount-input">

                  <span>৳</span>

                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>


              <div className="form-field">

                <label>
                  Date
                </label>

                <input
                  name="txn_date"
                  type="date"
                  value={form.txn_date}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>


            <div className="form-field">

              <label>
                Note
                <span>Optional</span>
              </label>

              <input
                name="note"
                type="text"
                placeholder={
                  form.type === 'income'
                    ? 'e.g. August salary'
                    : 'e.g. Lunch at restaurant'
                }
                value={form.note}
                onChange={handleChange}
              />

            </div>


            <div className="form-actions">

              {editingId && (

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>

              )}

              <button
                type="submit"
                className={
                  `submit-btn ${
                    form.type === 'income'
                      ? 'submit-income'
                      : 'submit-expense'
                  }`
                }
              >
                {editingId
                  ? 'Update Transaction'
                  : `Add ${
                      form.type === 'income'
                        ? 'Income'
                        : 'Expense'
                    }`}
              </button>

            </div>

          </form>

        </div>

      )}


      {/* =============================================
          TRANSACTION HISTORY
      ============================================= */}

      <div className="history-card">

        <div className="history-header">

          <div>

            <h2>
              Transaction History
            </h2>

            <p>
              {filteredTransactions.length}{' '}
              transaction
              {filteredTransactions.length !== 1
                ? 's'
                : ''}
            </p>

          </div>


          <div className="history-controls">

            <div className="search-box">

              <span>🔎</span>

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value)
              }
            >
              <option value="all">
                All
              </option>

              <option value="income">
                Income
              </option>

              <option value="expense">
                Expense
              </option>

            </select>

          </div>

        </div>


        {/* DESKTOP TABLE */}

        <div className="transaction-table-wrapper">

          <table className="transaction-table">

            <thead>

              <tr>

                <th>Date</th>

                <th>Category</th>

                <th>Type</th>

                <th>Amount</th>

                <th>Note</th>

                <th>Actions</th>

              </tr>

            </thead>


            <tbody>

              {filteredTransactions.length === 0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="empty-table"
                  >

                    <div>
                      💸
                    </div>

                    <strong>
                      Nothing here yet 🌱
                    </strong>

                    <span>
                      Add your first transaction and start understanding your money.
                    </span>

                    {transactions.length === 0 && (
                      <button
                        type="button"
                        className="empty-table-action"
                        onClick={() => setShowForm(true)}
                      >
                        ＋ Add Transaction
                      </button>
                    )}

                  </td>

                </tr>

              ) : (

                filteredTransactions.map(
                  (transaction) => (

                    <tr key={transaction.id}>

                      <td>

                        {new Date(
                          transaction.txn_date
                        ).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}

                      </td>


                      <td>

                        <div className="table-category">

                          <span>
                            {getCategoryGroup(
                              transaction.category_name || '',
                              transaction.type
                            )?.icon || '📁'}
                          </span>

                          <strong>
                            {transaction.category_name}
                          </strong>

                        </div>

                      </td>


                      <td>

                        <span
                          className={
                            transaction.type === 'income'
                              ? 'transaction-type income-type'
                              : 'transaction-type expense-type'
                          }
                        >
                          {transaction.type === 'income'
                            ? 'Income'
                            : 'Expense'}
                        </span>

                      </td>


                      <td>

                        <strong
                          className={
                            transaction.type === 'income'
                              ? 'amount-income'
                              : 'amount-expense'
                          }
                        >
                          {transaction.type === 'income'
                            ? '+'
                            : '-'}
                          ৳{Number(
                            transaction.amount
                          ).toLocaleString()}
                        </strong>

                      </td>


                      <td className="note-cell">

                        {transaction.note || '—'}

                      </td>


                      <td>

                        <div className="action-buttons">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              handleEdit(
                                transaction
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                transaction.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );
}