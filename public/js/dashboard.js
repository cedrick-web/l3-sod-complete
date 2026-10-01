async function loadDashboard() {
    const usersList = document.getElementById("users-list");
    const projectsList = document.getElementById("projects-list");
    const descriptionsList = document.getElementById("descriptions-list");
    const errorBox = document.getElementById("load-error");

    try {
        const [usersResponse, projectsResponse] = await Promise.all([
            fetch("/api/users"),
            fetch("/api/projects")
        ]);
        if (!usersResponse.ok || !projectsResponse.ok) {
            throw new Error("The server could not retrieve dashboard data.");
        }

        const users = await usersResponse.json();
        const projects = await projectsResponse.json();

        usersList.replaceChildren();
        if (users.length === 0) {
            const item = document.createElement("li");
            item.textContent = "No registered users yet.";
            usersList.appendChild(item);
        } else {
            users.forEach(user => {
                const item = document.createElement("li");
                item.textContent = user.name;
                usersList.appendChild(item);
            });
        }

        projectsList.replaceChildren();
        descriptionsList.replaceChildren();
        if (projects.length !== 4) {
            errorBox.textContent = `The database currently contains ${projects.length} projects. The assignment requires exactly four. Check database/database.sql.`;
        }

        projects.forEach(project => {
            const item = document.createElement("li");
            item.textContent = project.name;
            projectsList.appendChild(item);

            const block = document.createElement("article");
            block.className = "description-item";
            const heading = document.createElement("h4");
            heading.textContent = project.name;
            const paragraph = document.createElement("p");
            paragraph.textContent = project.description;
            block.append(heading, paragraph);
            descriptionsList.appendChild(block);
        });

        if (projects.length === 0) {
            projectsList.textContent = "No projects found.";
            descriptionsList.textContent = "No project descriptions found.";
        }
    } catch (error) {
        console.error(error);
        errorBox.textContent = error.message + " Confirm that MySQL is running and the database has been created.";
        usersList.textContent = "Could not load users.";
        projectsList.textContent = "Could not load projects.";
        descriptionsList.textContent = "Could not load descriptions.";
    }
}

loadDashboard();

async function showAdminDashboardButton() {
    try {
        const response = await fetch("/api/session");
        const session = await response.json();

        if (!session.loggedIn || session.user?.role !== "admin") {
            return;
        }

        let button = document.getElementById("adminDashboardButton");

        if (!button) {
            button = document.createElement("a");
            button.id = "adminDashboardButton";
            button.href = "/admin";
            button.textContent = "Admin Dashboard";
            button.className = "admin-dashboard-btn";

            const nav = document.querySelector("nav") ||
                        document.querySelector("header") ||
                        document.querySelector(".navbar");

            if (nav) {
                nav.appendChild(button);
            } else {
                document.body.prepend(button);
            }
        }
    } catch (error) {
        console.error("Could not check admin status:", error);
    }
}

document.addEventListener("DOMContentLoaded", showAdminDashboardButton);
