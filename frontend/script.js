// ---------- SELECT ELEMENTS ----------
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");

// ---------- INITIALIZE ----------
let expenses = [];
let editExpenseId = null; // Global variable to track editing state

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

  if (editExpenseId) {
    const idx = expenses.findIndex(exp => exp.id === editExpenseId);
    if (idx >= 0) {
      expenses[idx] = {
        id: editExpenseId,
        title,
        amount: parseFloat(amount.toFixed(2)),
        paidBy,
        date,
      };
    }
    editExpenseId = null;
    expenseForm.querySelector("button[type=submit]").textContent = "Add Expense";
  } else {
    const expense = {
      id: Date.now(),
      title,
      amount: parseFloat(amount.toFixed(2)),
      paidBy,
      date,
    };
    expenses.push(expense);
  }

  saveExpenses();
  renderExpenses();
  expenseForm.reset();
});

// ---------- DRAG AND DROP HANDLERS ----------
let dragSrcEl = null;

function handleDragStart(e) {
  this.style.opacity = '0.4';
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const bounding = this.getBoundingClientRect();
  const offset = e.clientY - bounding.top;

  if (offset > bounding.height / 2) {
    this.style['border-bottom'] = '4px solid #2196f3';
    this.style['border-top'] = '';
  } else {
    this.style['border-top'] = '4px solid #2196f3';
    this.style['border-bottom'] = '';
  }

  return false;
}

function handleDragEnter() {
  this.classList.add('over');
}

function handleDragLeave() {
  this.classList.remove('over');
  this.style['border-top'] = '';
  this.style['border-bottom'] = '';
}

function handleDrop(e) {
  e.stopPropagation();

  let items = document.querySelectorAll('#expense-list li');
  items.forEach(item => {
    item.style['border-top'] = '';
    item.style['border-bottom'] = '';
    item.classList.remove('over');
  });

  if (dragSrcEl !== this) {
    let srcId = dragSrcEl.getAttribute('data-id');
    let targetId = this.getAttribute('data-id');

    const bounding = this.getBoundingClientRect();
    const offset = e.clientY - bounding.top;

    let srcIndex = expenses.findIndex(exp => exp.id == srcId);
    let targetIndex = expenses.findIndex(exp => exp.id == targetId);

    if (srcIndex >= 0 && targetIndex >= 0) {
      const movedItem = expenses.splice(srcIndex, 1)[0];
      if (offset > bounding.height / 2) {
        expenses.splice(targetIndex + 1, 0, movedItem);
      } else {
        expenses.splice(targetIndex, 0, movedItem);
      }
      saveExpenses();
      renderExpenses();
    }
  }
  return false;
}

function handleDragEnd() {
  this.style.opacity = '1';
  let items = document.querySelectorAll('#expense-list li');
  items.forEach(item => {
    item.classList.remove('over');
    item.style['border-top'] = '';
    item.style['border-bottom'] = '';
  });
}

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
    li.setAttribute("draggable", true);
    li.innerHTML = `
      <div>
        <strong>${exp.title}</strong> - ₹${exp.amount.toFixed(2)}<br>
        <small>Paid by: ${exp.paidBy} | ${exp.date}</small>
      </div>
      <div>
        <button class="edit-btn" onclick="startEditExpense(${exp.id})">✏️</button>
        <button class="delete-btn" onclick="deleteExpense(${exp.id})">🗑</button>
      </div>
    `;

    li.addEventListener('dragstart', handleDragStart, false);
    li.addEventListener('dragenter', handleDragEnter, false);
    li.addEventListener('dragover', handleDragOver, false);
    li.addEventListener('dragleave', handleDragLeave, false);
    li.addEventListener('drop', handleDrop, false);
    li.addEventListener('dragend', handleDragEnd, false);

    expenseList.appendChild(li);
  });

  updateSummary();
  renderBalances();
}

// ---------- START EDITING EXPENSE ----------
function startEditExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById("title").value = exp.title;
  document.getElementById("amount").value = exp.amount;
  document.getElementById("paidBy").value = exp.paidBy;
  document.getElementById("date").value = exp.date;

  editExpenseId = id;
  expenseForm.querySelector("button[type=submit]").textContent = "Update Expense";
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
