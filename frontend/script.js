// ---------- SELECT ELEMENTS ----------
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");

// ---------- INITIALIZE ----------
let expenses = [];
let editExpenseId = null; // Track editing via form (optional, not used in inline editing)

// ---------- ADD or UPDATE EXPENSE ----------
expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const paidBy = document.getElementById("paidBy").value.trim();
  const date = document.getElementById("date").value;

  // Validation
  if (!title || !paidBy || !date || isNaN(amount) || amount <= 0) {
    alert("⚠ Please fill in all fields correctly!");
    return;
  }

  // Add new expense
  const expense = {
    id: Date.now(),
    title,
    amount: parseFloat(amount.toFixed(2)),
    paidBy,
    date,
  };
  expenses.push(expense);

  saveExpenses();
  renderExpenses();
  expenseForm.reset();
});

// ---------- RENDER EXPENSES ----------
function renderExpenses() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    expenseList.innerHTML = `<p style="text-align:center; color:#555;">No expenses added yet.</p>`;
    updateSummary();
    renderBalances();
    return;
  }

  expenses.forEach((exp) => {
    const li = document.createElement("li");
    li.setAttribute("data-id", exp.id);
    li.innerHTML = `
      <div>
        <strong>${exp.title}</strong> - ₹${exp.amount.toFixed(2)}<br>
        <small>Paid by: ${exp.paidBy} | ${exp.date}</small>
      </div>
      <div>
        <button onclick="enableInlineEdit(${exp.id})">✏️ Edit</button>
        <button class="delete-btn" onclick="deleteExpense(${exp.id})">🗑</button>
      </div>
    `;
    expenseList.appendChild(li);
  });

  updateSummary();
  renderBalances();
}

// ---------- INLINE EDITING ----------
function enableInlineEdit(expenseId) {
  const li = document.querySelector(`li[data-id='${expenseId}']`);
  if (!li) return;

  const expense = expenses.find(e => e.id === expenseId);
  if (!expense) return;

  li.innerHTML = `
    <input type="text" id="edit-title-${expenseId}" value="${expense.title}" placeholder="Title" />
    <input type="number" id="edit-amount-${expenseId}" value="${expense.amount.toFixed(2)}" placeholder="Amount" />
    <input type="text" id="edit-paidBy-${expenseId}" value="${expense.paidBy}" placeholder="Paid By" />
    <input type="date" id="edit-date-${expenseId}" value="${expense.date}" />
    <button onclick="saveInlineEdit(${expenseId})">Save</button>
    <button onclick="renderExpenses()">Cancel</button>
  `;
}

function saveInlineEdit(expenseId) {
  const title = document.getElementById(`edit-title-${expenseId}`).value.trim();
  const amountStr = document.getElementById(`edit-amount-${expenseId}`).value;
  const amount = parseFloat(amountStr);
  const paidBy = document.getElementById(`edit-paidBy-${expenseId}`).value.trim();
  const date = document.getElementById(`edit-date-${expenseId}`).value;

  if (!title || !paidBy || !date || isNaN(amount) || amount <= 0) {
    alert("⚠ Please fill all fields correctly!");
    return;
  }

  const idx = expenses.findIndex(exp => exp.id === expenseId);
  if (idx >= 0) {
    expenses[idx] = {
      id: expenseId,
      title,
      amount: parseFloat(amount.toFixed(2)),
      paidBy,
      date,
    };
    saveExpenses();
    renderExpenses();
  }
}

// ---------- DELETE EXPENSE ----------
function deleteExpense(id) {
  const confirmDelete = confirm("🗑 Are you sure you want to delete this expense?");
  if (!confirmDelete) return;

  expenses = expenses.filter((exp) => exp.id !== id);
  saveExpenses();
  renderExpenses();
}

// ---------- LOCAL STORAGE ----------
function saveExpenses() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function loadExpenses() {
  try {
    const stored = localStorage.getItem("expenses");
    if (stored) expenses = JSON.parse(stored);
  } catch (error) {
    console.error("Error loading expenses:", error);
    expenses = [];
  }
  renderExpenses();
}

// ---------- SUMMARY CALCULATION ----------
function updateSummary() {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const spendBy = {};
  expenses.forEach((exp) => {
    spendBy[exp.paidBy] = (spendBy[exp.paidBy] || 0) + exp.amount;
  });

  let highestSpender = "-";
  let maxSpent = 0;
  for (const person in spendBy) {
    if (spendBy[person] > maxSpent) {
      maxSpent = spendBy[person];
      highestSpender = person;
    }
  }

  const avg =
    Object.keys(spendBy).length > 0
      ? (total / Object.keys(spendBy).length).toFixed(2)
      : 0;

  document.getElementById("total").textContent = `Total: ₹${total.toFixed(2)}`;
  document.getElementById("highest").textContent = `Highest Spender: ${highestSpender} (₹${maxSpent.toFixed(2)})`;
  document.getElementById("average").textContent = `Average per person: ₹${avg}`;
}

// ---------- BALANCE CALCULATION ----------
function calculateBalances() {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const friends = {};
  expenses.forEach(exp => {
    if (!friends[exp.paidBy]) friends[exp.paidBy] = 0;
    friends[exp.paidBy] += exp.amount;
  });

  const numFriends = Object.keys(friends).length;
  const share = numFriends ? total / numFriends : 0;

  const balances = {};
  for (const friend in friends) {
    balances[friend] = parseFloat((friends[friend] - share).toFixed(2));
  }

  return balances;
}

// ---------- RENDER BALANCES ----------
function renderBalances() {
  const balancesList = document.getElementById("balances-list");
  balancesList.innerHTML = "";

  const balances = calculateBalances();

  if (Object.keys(balances).length === 0) {
    balancesList.innerHTML = `<p>No expenses added yet to calculate balances.</p>`;
    return;
  }

  for (const friend in balances) {
    const li = document.createElement("li");
    const balance = balances[friend];
    let text = "";

    if (balance > 0) {
      text = `${friend} should receive ₹${balance}`;
    } else if (balance < 0) {
      text = `${friend} owes ₹${Math.abs(balance)}`;
    } else {
      text = `${friend} is settled up.`;
    }

    li.textContent = text;
    balancesList.appendChild(li);
  }
}

const toggle = document.getElementById("darkModeToggle");

// Load saved preference on page load
window.addEventListener("DOMContentLoaded", () => {
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "enabled") {
    document.body.classList.add("dark-mode");
    toggle.checked = true;
  }
});

toggle.addEventListener("change", () => {
  if (toggle.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("darkMode", "enabled");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("darkMode", "disabled");
  }
});

// ---------- INIT APP ----------
loadExpenses();
