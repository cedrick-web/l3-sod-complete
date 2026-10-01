const adminWelcome = document.getElementById("adminWelcome");

const totalUsers = document.getElementById("totalUsers");
const totalAdmins = document.getElementById("totalAdmins");
const totalStudents = document.getElementById("totalStudents");
const totalProjects = document.getElementById("totalProjects");

const usersTableBody = document.getElementById("usersTableBody");
const message = document.getElementById("message");
const userSearch = document.getElementById("userSearch");

const userModal = document.getElementById("userModal");
const modalTitle = document.getElementById("modalTitle");

const userForm = document.getElementById("userForm");
const userId = document.getElementById("userId");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userPassword = document.getElementById("userPassword");
const userRole = document.getElementById("userRole");

const passwordHelp = document.getElementById("passwordHelp");

const createUserButton =
    document.getElementById("createUserButton");

const closeModal =
    document.getElementById("closeModal");

const cancelButton =
    document.getElementById("cancelButton");

let currentAdmin = null;
let users = [];

/* =========================
   INITIALIZE
   ========================= */

async function initializeAdmin() {
    try {
        const response = await fetch("/api/session");

        if (!response.ok) {
            window.location.href = "/login";
            return;
        }

        currentAdmin = await response.json();

        if (currentAdmin.role !== "admin") {
            window.location.href = "/dashboard";
            return;
        }

        adminWelcome.textContent =
            `Logged in as ${currentAdmin.name} (${currentAdmin.email})`;

        await Promise.all([
            loadStats(),
            loadUsers()
        ]);

    } catch (error) {
        console.error(error);
        showMessage(
            "Could not load admin dashboard.",
            "error"
        );
    }
}

/* =========================
   STATISTICS
   ========================= */

async function loadStats() {
    const response = await fetch("/api/admin/stats");

    if (!response.ok) {
        throw new Error("Could not load statistics");
    }

    const stats = await response.json();

    totalUsers.textContent = stats.totalUsers;
    totalAdmins.textContent = stats.totalAdmins;
    totalStudents.textContent = stats.totalStudents;
    totalProjects.textContent = stats.totalProjects;
}

/* =========================
   LOAD USERS
   ========================= */

async function loadUsers() {
    const response = await fetch("/api/users");

    if (!response.ok) {
        throw new Error("Could not load users");
    }

    users = await response.json();

    renderUsers();
}

/* =========================
   DISPLAY USERS
   ========================= */

function renderUsers() {
    const search = userSearch.value
        .trim()
        .toLowerCase();

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
    );

    usersTableBody.innerHTML = "";

    if (!filteredUsers.length) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6">No users found.</td>
            </tr>
        `;

        return;
    }

    filteredUsers.forEach(user => {

        const row = document.createElement("tr");

        const createdDate = user.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "-";

        const isCurrentAdmin =
            Number(user.id) === Number(currentAdmin.id);

        row.innerHTML = `
            <td>${user.id}</td>

            <td>
                ${escapeHtml(user.name)}
                ${
                    isCurrentAdmin
                        ? '<span class="you-badge">You</span>'
                        : ''
                }
            </td>

            <td>${escapeHtml(user.email)}</td>

            <td>
                <select
                    class="role-select"
                    data-id="${user.id}"
                    ${isCurrentAdmin ? "disabled" : ""}
                >
                    <option
                        value="student"
                        ${user.role === "student" ? "selected" : ""}
                    >
                        Student
                    </option>

                    <option
                        value="admin"
                        ${user.role === "admin" ? "selected" : ""}
                    >
                        Admin
                    </option>
                </select>
            </td>

            <td>${createdDate}</td>

            <td class="actions">

                <button
                    class="edit-button"
                    onclick="openEditUser(${user.id})"
                >
                    Edit
                </button>

                <button
                    class="save-role-button"
                    onclick="changeRole(${user.id})"
                    ${isCurrentAdmin ? "disabled" : ""}
                >
                    Role
                </button>

                <button
                    class="delete-button"
                    onclick="deleteUser(${user.id})"
                    ${isCurrentAdmin ? "disabled" : ""}
                >
                    Delete
                </button>

            </td>
        `;

        usersTableBody.appendChild(row);
    });
}

/* =========================
   CREATE USER
   ========================= */

function openCreateUser() {
    modalTitle.textContent = "Create User";

    userForm.reset();

    userId.value = "";

    userRole.value = "student";

    userPassword.required = true;

    passwordHelp.textContent =
        "(required for new users)";

    userModal.classList.remove("hidden");

    userName.focus();
}

/* =========================
   EDIT USER
   ========================= */

function openEditUser(id) {
    const user = users.find(
        item => Number(item.id) === Number(id)
    );

    if (!user) {
        showMessage(
            "User not found.",
            "error"
        );

        return;
    }

    modalTitle.textContent = "Edit User";

    userId.value = user.id;
    userName.value = user.name;
    userEmail.value = user.email;
    userRole.value = user.role;

    userPassword.value = "";
    userPassword.required = false;

    passwordHelp.textContent =
        "(leave empty to keep current password)";

    userModal.classList.remove("hidden");

    userName.focus();
}

/* =========================
   SAVE USER
   ========================= */

userForm.addEventListener("submit", async event => {

    event.preventDefault();

    const id = userId.value;

    const data = {
        name: userName.value.trim(),
        email: userEmail.value.trim(),
        password: userPassword.value,
        role: userRole.value
    };

    try {

        let response;

        if (id) {

            response = await fetch(
                `/api/users/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

        } else {

            response = await fetch(
                "/api/users",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );
        }

        const result = await response.json();

        if (!response.ok) {
            showMessage(
                result.message || "Operation failed.",
                "error"
            );

            return;
        }

        closeUserModal();

        showMessage(
            id
                ? "User updated successfully."
                : "User created successfully.",
            "success"
        );

        await loadUsers();
        await loadStats();

    } catch (error) {

        console.error(error);

        showMessage(
            "Could not save user.",
            "error"
        );
    }
});

/* =========================
   CHANGE ROLE
   ========================= */

async function changeRole(id) {

    const select = document.querySelector(
        `.role-select[data-id="${id}"]`
    );

    if (!select) {
        return;
    }

    const role = select.value;

    try {

        const response = await fetch(
            `/api/users/${id}/role`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ role })
            }
        );

        const result = await response.json();

        if (!response.ok) {

            showMessage(
                result.message || "Could not change role.",
                "error"
            );

            await loadUsers();

            return;
        }

        showMessage(
            "User role updated successfully.",
            "success"
        );

        await loadUsers();
        await loadStats();

    } catch (error) {

        console.error(error);

        showMessage(
            "Could not change user role.",
            "error"
        );
    }
}

/* =========================
   DELETE USER
   ========================= */

async function deleteUser(id) {

    const user = users.find(
        item => Number(item.id) === Number(id)
    );

    if (!user) {
        return;
    }

    if (
        Number(user.id) ===
        Number(currentAdmin.id)
    ) {
        showMessage(
            "You cannot delete your own account.",
            "error"
        );

        return;
    }

    const confirmed = window.confirm(
        `Delete user "${user.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `/api/users/${id}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {

            showMessage(
                result.message || "Could not delete user.",
                "error"
            );

            return;
        }

        showMessage(
            "User deleted successfully.",
            "success"
        );

        await loadUsers();
        await loadStats();

    } catch (error) {

        console.error(error);

        showMessage(
            "Could not delete user.",
            "error"
        );
    }
}

/* =========================
   MODAL
   ========================= */

function closeUserModal() {
    userModal.classList.add("hidden");
    userForm.reset();
}

createUserButton.addEventListener(
    "click",
    openCreateUser
);

closeModal.addEventListener(
    "click",
    closeUserModal
);

cancelButton.addEventListener(
    "click",
    closeUserModal
);

userModal.addEventListener("click", event => {

    if (event.target === userModal) {
        closeUserModal();
    }

});

/* =========================
   SEARCH
   ========================= */

userSearch.addEventListener(
    "input",
    renderUsers
);

/* =========================
   MESSAGE
   ========================= */

function showMessage(text, type) {

    message.innerHTML =
        `<div class="${type}">
            ${escapeHtml(text)}
        </div>`;

    setTimeout(() => {
        message.innerHTML = "";
    }, 4000);
}

/* =========================
   SECURITY
   ========================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================
   START
   ========================= */

initializeAdmin();
