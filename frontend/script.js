// ---------- SELECT ELEMENTS ----------
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");

// ---------- INITIALIZE ----------
let expenses = [];

// ---------- ADD EXPENSE ----------
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

  const expense = {
    id: Date.now(),
    title,
    amount: parseFloat(amount.toFixed(2)), // keep 2 decimals
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
    return;
  }

  expenses.forEach((exp) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${exp.title}</strong> - ₹${exp.amount.toFixed(2)}  
        <br><small>Paid by: ${exp.paidBy} | ${exp.date}</small>
      </div>
      <button class="delete-btn" onclick="deleteExpense(${exp.id})">🗑</button>
    `;
    expenseList.appendChild(li);
  });

  updateSummary();
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

  // Calculate per-person spending
  const spendBy = {};
  expenses.forEach((exp) => {
    spendBy[exp.paidBy] = (spendBy[exp.paidBy] || 0) + exp.amount;
  });

  // Find highest spender
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

// ---------- INIT APP ----------
loadExpenses();
