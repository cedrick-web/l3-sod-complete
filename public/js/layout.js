const menuButton = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");

if (menuButton && sidebar) {
    sidebar.classList.add("closed");
    menuButton.addEventListener("click", () => sidebar.classList.toggle("closed"));
}

fetch("/api/session")
    .then(response => {
        if (!response.ok) throw new Error("Session expired");
        return response.json();
    })
    .then(user => {
        const welcome = document.getElementById("welcome");
        if (welcome) welcome.textContent = `Welcome, ${user.name}`;
    })
    .catch(() => {
        window.location.href = "/login";
    });
