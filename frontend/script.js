// ---------- SELECT ELEMENTS ----------
// Only select elements that exist on the current page
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const numPeopleInput = document.getElementById("numPeople");
const participantsContainer = document.getElementById("participants-container");

// Initialize elements that may not exist on all pages
if (numPeopleInput) {
  numPeopleInput.addEventListener("input", updateParticipantFields);
}

// ---------- INITIALIZE ----------
let expenses = [];
let editExpenseId = null; // Global variable to track editing state
let deletedExpenses = []; // Store recently deleted expenses for undo
let undoTimeout = null; // Timeout for auto-clearing undo

// ---------- DYNAMIC PARTICIPANT FIELDS ----------
function updateParticipantFields() {
  if (!numPeopleInput || !participantsContainer) return;

  const numPeople = parseInt(numPeopleInput.value) || 0;
  participantsContainer.innerHTML = "";

  for (let i = 0; i < numPeople; i++) {
    const participantDiv = document.createElement("div");
    participantDiv.className = "participant-field";
    participantDiv.innerHTML = `
      <input type="text" placeholder="Person ${i + 1} Name" class="participant-name" required />
      <input type="number" placeholder="Contribution (₹)" class="participant-amount" min="0" step="0.01" required />
    `;
    participantsContainer.appendChild(participantDiv);
  }
}

// ---------- ADD or UPDATE EXPENSE ----------
if (expenseForm) {
  expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const totalAmount = parseFloat(document.getElementById("totalAmount").value);
    const numPeople = parseInt(document.getElementById("numPeople").value);
    const date = document.getElementById("date").value;

    // Enhanced Validation
    if (!title) {
      alert("⚠ Please enter an expense title!");
      return;
    }

    if (!date) {
      alert("⚠ Please select a valid date!");
      return;
    }

    // Check if date is not in the future
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    if (selectedDate > today) {
      alert("⚠ Expense date cannot be in the future!");
      return;
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert("⚠ Please enter a valid total amount greater than 0!");
      return;
    }

    if (totalAmount > 1000000) {
      alert("⚠ Total amount cannot exceed ₹10,00,000!");
      return;
    }

    if (!numPeople || numPeople < 1) {
      alert("⚠ Number of people must be at least 1!");
      return;
    }

    if (numPeople > 20) {
      alert("⚠ Number of people cannot exceed 20!");
      return;
    }

    // Collect participants
    const participants = [];
    const participantFields = participantsContainer.querySelectorAll(".participant-field");
    let totalContributions = 0;
    const participantNames = new Set(); // Track names to prevent duplicates

    for (let field of participantFields) {
      const name = field.querySelector(".participant-name").value.trim();
      const amount = parseFloat(field.querySelector(".participant-amount").value) || 0;

      if (!name) {
        alert("⚠ Please enter names for all participants!");
        return;
      }

      if (name.length < 1) {
        alert("⚠ Participant names must be at least 1 character long!");
        return;
      }

      if (participantNames.has(name.toLowerCase())) {
        alert(`⚠ Duplicate participant name "${name}" is not allowed within the same expense!`);
        return;
      }

      participantNames.add(name.toLowerCase());

      if (amount < 0) {
        alert("⚠ Participant contributions cannot be negative!");
        return;
      }

      if (amount > totalAmount) {
        alert("⚠ Individual contribution cannot exceed the total expense amount!");
        return;
      }

      participants.push({ name, contribution: parseFloat(amount.toFixed(2)) });
      totalContributions += amount;
    }

    // Validate total contributions match bill amount
    if (Math.abs(totalContributions - totalAmount) > 0.01) {
      alert(`⚠ Total contributions (₹${totalContributions.toFixed(2)}) must equal the bill amount (₹${totalAmount.toFixed(2)})!`);
      return;
    }

    if (editExpenseId) {
      const idx = expenses.findIndex(exp => exp.id === editExpenseId);
      if (idx >= 0) {
        expenses[idx] = {
          id: editExpenseId,
          title,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          participants,
          date,
        };
      }
      editExpenseId = null;
      expenseForm.querySelector("button[type=submit]").textContent = "Add Expense";
    } else {
      const expense = {
        id: Date.now(),
        title,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        participants,
        date,
      };
      expenses.push(expense);
    }

    saveExpenses();
    renderExpenses();
    expenseForm.reset();
    updateParticipantFields(); // Clear participant fields
  });
}

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
  if (!expenseList) return;

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
    li.setAttribute("role", "listitem");
    li.setAttribute("tabindex", "0");

    // Build participants string
    const participantsStr = exp.participants.map(p => `${p.name}: ₹${p.contribution.toFixed(2)}`).join(", ");

    li.innerHTML = `
      <div>
        <strong>${exp.title}</strong> - ₹${exp.totalAmount.toFixed(2)}<br>
        <small>Contributions: ${participantsStr} | ${exp.date}</small>
      </div>
      <div>
        <button class="edit-btn" role="button" aria-label="Edit expense ${exp.title}" onclick="startEditExpense(${exp.id})">✏️</button>
        <button class="delete-btn" role="button" aria-label="Delete expense ${exp.title}" onclick="deleteExpense(${exp.id})">🗑</button>
      </div>
    `;

    li.addEventListener('dragstart', handleDragStart, false);
    li.addEventListener('dragenter', handleDragEnter, false);
    li.addEventListener('dragover', handleDragOver, false);
    li.addEventListener('dragleave', handleDragLeave, false);
    li.addEventListener('drop', handleDrop, false);
    li.addEventListener('dragend', handleDragEnd, false);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Focus the first button (edit) for interaction
        const editBtn = li.querySelector('.edit-btn');
        if (editBtn) editBtn.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveExpenseUp(exp.id);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveExpenseDown(exp.id);
      }
    });

    expenseList.appendChild(li);
  });

  updateSummary();
  renderBalances();
}

// ---------- START EDITING EXPENSE ----------
function startEditExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  // Check if elements exist before setting values
  const titleEl = document.getElementById("title");
  const totalAmountEl = document.getElementById("totalAmount");
  const numPeopleEl = document.getElementById("numPeople");
  const dateEl = document.getElementById("date");

  if (titleEl) titleEl.value = exp.title;
  if (totalAmountEl) totalAmountEl.value = exp.totalAmount;
  if (numPeopleEl) numPeopleEl.value = exp.participants.length;
  if (dateEl) dateEl.value = exp.date;

  // Populate participant fields
  updateParticipantFields();
  if (participantsContainer) {
    const participantFields = participantsContainer.querySelectorAll(".participant-field");
    exp.participants.forEach((participant, index) => {
      if (participantFields[index]) {
        participantFields[index].querySelector(".participant-name").value = participant.name;
        participantFields[index].querySelector(".participant-amount").value = participant.contribution;
      }
    });
  }

  editExpenseId = id;
  if (expenseForm) {
    expenseForm.querySelector("button[type=submit]").textContent = "Update Expense";
  }
}

// ---------- DELETE EXPENSE ----------
function deleteExpense(id) {
  const confirmDelete = confirm("🗑 Are you sure you want to delete this expense?");
  if (!confirmDelete) return;

  // Find and store the deleted expense for undo
  const deletedExpense = expenses.find(exp => exp.id === id);
  if (deletedExpense) {
    deletedExpenses.push(deletedExpense);
    // Clear previous undo timeout
    if (undoTimeout) clearTimeout(undoTimeout);
    // Set new timeout to auto-clear undo after 10 seconds
    undoTimeout = setTimeout(() => {
      deletedExpenses = [];
    }, 10000);
  }

  expenses = expenses.filter((exp) => exp.id !== id);
  saveExpenses();
  renderExpenses();

  // Show undo notification
  showUndoNotification();
}

// ---------- UNDO DELETE ----------
function undoDelete() {
  if (deletedExpenses.length > 0) {
    const lastDeleted = deletedExpenses.pop();
    expenses.push(lastDeleted);
    saveExpenses();
    renderExpenses();
    // Clear timeout since undo was used
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      undoTimeout = null;
    }
    hideUndoNotification();
  }
}

// ---------- SHOW UNDO NOTIFICATION ----------
function showUndoNotification() {
  let notification = document.getElementById("undo-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "undo-notification";
    notification.innerHTML = `
      <span>Expense deleted. </span>
      <button onclick="undoDelete()" style="background: #4caf50; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Undo</button>
      <span> (Auto-dismiss in 10s)</span>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 1000;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
  }
  notification.style.display = "block";
}

// ---------- HIDE UNDO NOTIFICATION ----------
function hideUndoNotification() {
  const notification = document.getElementById("undo-notification");
  if (notification) {
    notification.style.display = "none";
  }
}

// ---------- MOVE EXPENSE UP ----------
function moveExpenseUp(id) {
  const index = expenses.findIndex(exp => exp.id === id);
  if (index > 0) {
    [expenses[index], expenses[index - 1]] = [expenses[index - 1], expenses[index]];
    saveExpenses();
    renderExpenses();
  }
}

// ---------- MOVE EXPENSE DOWN ----------
function moveExpenseDown(id) {
  const index = expenses.findIndex(exp => exp.id === id);
  if (index >= 0 && index < expenses.length - 1) {
    [expenses[index], expenses[index + 1]] = [expenses[index + 1], expenses[index]];
    saveExpenses();
    renderExpenses();
  }
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
  const total = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

  const spendBy = {};
  expenses.forEach((exp) => {
    exp.participants.forEach(p => {
      spendBy[p.name] = (spendBy[p.name] || 0) + p.contribution;
    });
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

  const totalEl = document.getElementById("total");
  const highestEl = document.getElementById("highest");
  const averageEl = document.getElementById("average");

  if (totalEl) totalEl.textContent = `Total: ₹${total.toFixed(2)}`;
  if (highestEl) highestEl.textContent = `Highest Spender: ${highestSpender} (₹${maxSpent.toFixed(2)})`;
  if (averageEl) averageEl.textContent = `Average per person: ₹${avg}`;
}

// ---------- BALANCE CALCULATION ----------
function calculateBalances() {
  // Calculate balances per expense among only its participants
  const balances = {};

  expenses.forEach(exp => {
    const numParticipants = exp.participants.length;
    // Calculate equal share with precise rounding to avoid floating-point errors
    const equalShare = numParticipants > 0 ? Math.round((exp.totalAmount / numParticipants) * 100) / 100 : 0;

    exp.participants.forEach(p => {
      // Calculate net balance with precise rounding
      const netBalance = Math.round((p.contribution - equalShare) * 100) / 100;
      // Accumulate with precise rounding to prevent floating-point accumulation errors
      balances[p.name] = Math.round(((balances[p.name] || 0) + netBalance) * 100) / 100;
    });
  });

  return balances;
}

// ---------- RENDER EXPENSE BREAKDOWN ----------
function renderExpenseBreakdown() {
  const breakdownSection = document.getElementById("expense-breakdown");
  if (breakdownSection) {
    breakdownSection.innerHTML = "";

    if (expenses.length === 0) {
      breakdownSection.innerHTML = `<p>No expenses added yet to show breakdown.</p>`;
      return;
    }

    expenses.forEach((exp) => {
      const expDiv = document.createElement("div");
      expDiv.className = "expense-breakdown-item";

      const numParticipants = exp.participants.length;
      const equalShare = numParticipants > 0 ? exp.totalAmount / numParticipants : 0;

      let breakdownHTML = `<h4>${exp.title} - ₹${exp.totalAmount.toFixed(2)}</h4>`;
      breakdownHTML += `<p><strong>Equal share per person: ₹${equalShare.toFixed(2)}</strong></p>`;
      breakdownHTML += `<ul>`;

      exp.participants.forEach(p => {
        const netBalance = p.contribution - equalShare;
        let status = "";
        if (netBalance > 0) {
          status = `should receive ₹${netBalance.toFixed(2)}`;
        } else if (netBalance < 0) {
          status = `owes ₹${Math.abs(netBalance).toFixed(2)}`;
        } else {
          status = `is settled`;
        }
        breakdownHTML += `<li>${p.name} paid ₹${p.contribution.toFixed(2)} - ${status}</li>`;
      });

      breakdownHTML += `</ul>`;
      expDiv.innerHTML = breakdownHTML;
      breakdownSection.appendChild(expDiv);
    });
  }
}

// ---------- RENDER BALANCES ----------
function renderBalances() {
  const balancesList = document.getElementById("balances-list");
  if (balancesList) {
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

  // Also render expense breakdown if on summary page
  renderExpenseBreakdown();
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

// Initialize summary and balances on pages that don't have expense list (like summary.html)
if (!expenseList) {
  updateSummary();
  renderBalances();
}
