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
