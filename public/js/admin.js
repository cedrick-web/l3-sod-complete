const adminWelcome = document.getElementById("adminWelcome");
const usersTableBody = document.getElementById("usersTableBody");
const message = document.getElementById("message");

async function loadAdmin() {
    try {
        const sessionResponse = await fetch("/api/session");

        if (!sessionResponse.ok) {
            window.location.href = "/login";
            return;
        }

        const user = await sessionResponse.json();

        if (user.role !== "admin") {
            window.location.href = "/dashboard";
            return;
        }

        adminWelcome.textContent = `Logged in as ${user.name} (${user.email})`;

        await loadUsers();

    } catch (error) {
        console.error(error);
        showMessage("Could not load admin dashboard.", "error");
    }
}

async function loadUsers() {
    const response = await fetch("/api/users");

    if (!response.ok) {
        throw new Error("Could not load users");
    }

    const users = await response.json();

    usersTableBody.innerHTML = "";

    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5">No users found.</td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.id}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <select id="role-${user.id}">
                    <option value="student" ${user.role === "student" ? "selected" : ""}>
                        Student
                    </option>
                    <option value="admin" ${user.role === "admin" ? "selected" : ""}>
                        Admin
                    </option>
                </select>
            </td>
            <td>
                <button class="save-role" onclick="updateRole(${user.id})">
                    Save
                </button>
            </td>
        `;

        usersTableBody.appendChild(row);
    });
}

async function updateRole(userId) {
    const select = document.getElementById(`role-${userId}`);
    const role = select.value;

    try {
        const response = await fetch(`/api/users/${userId}/role`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ role })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Could not update role.", "error");
            await loadUsers();
            return;
        }

        showMessage("User role updated successfully.", "success");
        await loadUsers();

    } catch (error) {
        console.error(error);
        showMessage("Could not update user role.", "error");
    }
}

function showMessage(text, type) {
    message.innerHTML = `<div class="${type}">${escapeHtml(text)}</div>`;

    setTimeout(() => {
        message.innerHTML = "";
    }, 4000);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadAdmin();
