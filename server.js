const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./database/db");

const app = express();
const PORT = 3001;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "change-this-l3-sod-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000
    }
}));

app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));

/* =========================
   AUTHENTICATION MIDDLEWARE
   ========================= */

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    if (req.session.user.role !== "admin") {
        return res.status(403).send("Access denied. Administrator privileges required.");
    }

    next();
}

function redirectIfLoggedIn(req, res, next) {
    if (req.session.user) {
        return res.redirect(
            req.session.user.role === "admin"
                ? "/admin"
                : "/dashboard"
        );
    }

    next();
}

/* =========================
   PAGES
   ========================= */

app.get("/", requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/home", requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/about", requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "public/about.html"))
);

app.get("/dashboard", requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, "public/dashboard.html"))
);

app.get("/admin", requireAdmin, (req, res) =>
    res.sendFile(path.join(__dirname, "public/admin.html"))
);

app.get("/login", redirectIfLoggedIn, (req, res) =>
    res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/register", redirectIfLoggedIn, (req, res) =>
    res.sendFile(path.join(__dirname, "public/register.html"))
);

/* =========================
   REGISTRATION
   ========================= */

app.post("/register", async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
        return res.redirect(
            "/register?error=Please%20fill%20in%20all%20fields"
        );
    }

    if (password.length < 6) {
        return res.redirect(
            "/register?error=Password%20must%20be%20at%20least%206%20characters"
        );
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, 'student')`,
            [name, email, hashedPassword],
            (error) => {
                if (error) {
                    if (error.code === "ER_DUP_ENTRY") {
                        return res.redirect(
                            "/register?error=That%20email%20is%20already%20registered"
                        );
                    }

                    console.error("Registration database error:", error);

                    return res.redirect(
                        "/register?error=Registration%20failed"
                    );
                }

                return res.redirect(
                    "/login?message=Account%20created.%20Please%20log%20in"
                );
            }
        );
    } catch (error) {
        console.error("Registration error:", error);

        res.redirect("/register?error=Registration%20failed");
    }
});

/* =========================
   LOGIN
   ========================= */

app.post("/login", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
        return res.redirect(
            "/login?error=Enter%20your%20email%20and%20password"
        );
    }

    db.query(
        `SELECT id, name, email, password, role
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email],
        async (error, rows) => {
            if (error) {
                console.error("Login database error:", error);

                return res.redirect(
                    "/login?error=Login%20failed"
                );
            }

            if (!rows.length) {
                return res.redirect(
                    "/login?error=Invalid%20email%20or%20password"
                );
            }

            try {
                const user = rows[0];

                const matches = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!matches) {
                    return res.redirect(
                        "/login?error=Invalid%20email%20or%20password"
                    );
                }

                req.session.regenerate((sessionError) => {
                    if (sessionError) {
                        console.error("Session error:", sessionError);

                        return res.redirect(
                            "/login?error=Could%20not%20start%20session"
                        );
                    }

                    req.session.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    };

                    req.session.save(() => {
                        if (user.role === "admin") {
                            return res.redirect("/admin");
                        }

                        return res.redirect("/dashboard");
                    });
                });
            } catch (compareError) {
                console.error(
                    "Password check error:",
                    compareError
                );

                res.redirect("/login?error=Login%20failed");
            }
        }
    );
});

/* =========================
   LOGOUT
   ========================= */

app.post("/logout", requireLogin, (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login?message=You%20have%20logged%20out");
    });
});

app.get("/logout", requireLogin, (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login?message=You%20have%20logged%20out");
    });
});

/* =========================
   SESSION API
   ========================= */

app.get("/api/session", requireLogin, (req, res) => {
    res.json(req.session.user);
});

/* =========================
   ADMIN USER API
   ========================= */

app.get("/api/users", requireAdmin, (req, res) => {
    db.query(
        `SELECT id, name, email, role
         FROM users
         ORDER BY id ASC`,
        (error, rows) => {
            if (error) {
                console.error("Users query error:", error);

                return res.status(500).json({
                    message: "Could not load users"
                });
            }

            res.json(rows);
        }
    );
});

/* =========================
   CHANGE USER ROLE
   ========================= */

app.put("/api/users/:id/role", requireAdmin, (req, res) => {
    const targetUserId = Number(req.params.id);
    const newRole = String(req.body.role || "").trim();

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }

    if (!["student", "admin"].includes(newRole)) {
        return res.status(400).json({
            message: "Role must be student or admin"
        });
    }

    /* Prevent an admin from changing their own role */
    if (targetUserId === Number(req.session.user.id)) {
        return res.status(403).json({
            message: "You cannot change your own role."
        });
    }

    db.query(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [targetUserId],
        (error, rows) => {
            if (error) {
                console.error("Target user lookup error:", error);

                return res.status(500).json({
                    message: "Could not find user"
                });
            }

            if (!rows.length) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const targetUser = rows[0];

            /* Prevent removing the final administrator */
            if (
                targetUser.role === "admin" &&
                newRole === "student"
            ) {
                db.query(
                    "SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'",
                    (countError, countRows) => {
                        if (countError) {
                            console.error(
                                "Admin count error:",
                                countError
                            );

                            return res.status(500).json({
                                message: "Could not verify administrator count"
                            });
                        }

                        const adminCount =
                            Number(countRows[0].adminCount);

                        if (adminCount <= 1) {
                            return res.status(403).json({
                                message:
                                    "The last administrator cannot be removed."
                            });
                        }

                        updateUserRole(
                            targetUserId,
                            newRole,
                            res
                        );
                    }
                );

                return;
            }

            updateUserRole(
                targetUserId,
                newRole,
                res
            );
        }
    );
});

function updateUserRole(userId, role, res) {
    db.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, userId],
        (error, result) => {
            if (error) {
                console.error(
                    "Role update error:",
                    error
                );

                return res.status(500).json({
                    message: "Could not update user role"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json({
                message: "User role updated successfully"
            });
        }
    );
}

/* =========================
   PROJECTS API
   ========================= */

app.get("/api/projects", requireLogin, (req, res) => {
    db.query(
        `SELECT id, name, description, status
         FROM projects
         ORDER BY id ASC`,
        (error, rows) => {
            if (error) {
                console.error("Projects query error:", error);

                return res.status(500).json({
                    message: "Could not load projects"
                });
            }

            res.json(rows);
        }
    );
});

/* =========================
   404
   ========================= */

app.use((req, res) => {
    res.status(404).send("Page not found.");
});

/* =========================
   START SERVER
   ========================= */

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
