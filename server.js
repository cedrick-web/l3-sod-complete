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
   AUTHENTICATION
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
        return res.status(403).send(
            "Access denied. Administrator privileges required."
        );
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
   REGISTER
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

                    console.error("Registration error:", error);

                    return res.redirect(
                        "/register?error=Registration%20failed"
                    );
                }

                res.redirect(
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

                        res.redirect("/dashboard");
                    });
                });
            } catch (error) {
                console.error("Password check error:", error);

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
   SESSION
   ========================= */

app.get("/api/session", requireLogin, (req, res) => {
    res.json(req.session.user);
});

/* =========================
   ADMIN: STATISTICS
   ========================= */

app.get("/api/admin/stats", requireAdmin, (req, res) => {
    db.query(
        `SELECT
            COUNT(*) AS totalUsers,
            SUM(role = 'admin') AS totalAdmins,
            SUM(role = 'student') AS totalStudents
         FROM users`,
        (userError, userRows) => {
            if (userError) {
                console.error("User stats error:", userError);

                return res.status(500).json({
                    message: "Could not load statistics"
                });
            }

            db.query(
                "SELECT COUNT(*) AS totalProjects FROM projects",
                (projectError, projectRows) => {
                    if (projectError) {
                        console.error(
                            "Project stats error:",
                            projectError
                        );

                        return res.status(500).json({
                            message: "Could not load statistics"
                        });
                    }

                    res.json({
                        totalUsers: Number(userRows[0].totalUsers || 0),
                        totalAdmins: Number(userRows[0].totalAdmins || 0),
                        totalStudents: Number(userRows[0].totalStudents || 0),
                        totalProjects: Number(
                            projectRows[0].totalProjects || 0
                        )
                    });
                }
            );
        }
    );
});

/* =========================
   ADMIN: READ USERS
   ========================= */

app.get("/api/users", requireAdmin, (req, res) => {
    db.query(
        `SELECT id, name, email, role, created_at
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
   ADMIN: CREATE USER
   ========================= */

app.post("/api/users", requireAdmin, async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "student").trim();

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required."
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters."
        });
    }

    if (!["student", "admin"].includes(role)) {
        return res.status(400).json({
            message: "Role must be student or admin."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            `INSERT INTO users
             (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, role],
            (error, result) => {
                if (error) {
                    if (error.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "That email is already registered."
                        });
                    }

                    console.error("Create user error:", error);

                    return res.status(500).json({
                        message: "Could not create user."
                    });
                }

                res.status(201).json({
                    message: "User created successfully.",
                    userId: result.insertId
                });
            }
        );
    } catch (error) {
        console.error("Password hashing error:", error);

        res.status(500).json({
            message: "Could not create user."
        });
    }
});

/* =========================
   ADMIN: UPDATE USER
   ========================= */

app.put("/api/users/:id", requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    if (!name || !email) {
        return res.status(400).json({
            message: "Name and email are required."
        });
    }

    try {
        let query;
        let values;

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    message: "Password must be at least 6 characters."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            query = `
                UPDATE users
                SET name = ?, email = ?, password = ?
                WHERE id = ?
            `;

            values = [
                name,
                email,
                hashedPassword,
                userId
            ];
        } else {
            query = `
                UPDATE users
                SET name = ?, email = ?
                WHERE id = ?
            `;

            values = [
                name,
                email,
                userId
            ];
        }

        db.query(query, values, (error, result) => {
            if (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "That email is already registered."
                    });
                }

                console.error("Update user error:", error);

                return res.status(500).json({
                    message: "Could not update user."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            /* Keep the current admin's session information current */
            if (userId === Number(req.session.user.id)) {
                req.session.user.name = name;
                req.session.user.email = email;
            }

            res.json({
                message: "User updated successfully."
            });
        });
    } catch (error) {
        console.error("Update user error:", error);

        res.status(500).json({
            message: "Could not update user."
        });
    }
});

/* =========================
   ADMIN: CHANGE ROLE
   ========================= */

app.put("/api/users/:id/role", requireAdmin, (req, res) => {
    const targetUserId = Number(req.params.id);
    const newRole = String(req.body.role || "").trim();

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    if (!["student", "admin"].includes(newRole)) {
        return res.status(400).json({
            message: "Role must be student or admin."
        });
    }

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
                    message: "Could not find user."
                });
            }

            if (!rows.length) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const targetUser = rows[0];

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
                                message:
                                    "Could not verify administrator count."
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
                console.error("Role update error:", error);

                return res.status(500).json({
                    message: "Could not update user role."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            res.json({
                message: "User role updated successfully."
            });
        }
    );
}

/* =========================
   ADMIN: DELETE USER
   ========================= */

app.delete("/api/users/:id", requireAdmin, (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    if (userId === Number(req.session.user.id)) {
        return res.status(403).json({
            message: "You cannot delete your own account."
        });
    }

    db.query(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [userId],
        (error, rows) => {
            if (error) {
                console.error("Delete lookup error:", error);

                return res.status(500).json({
                    message: "Could not find user."
                });
            }

            if (!rows.length) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const targetUser = rows[0];

            if (targetUser.role === "admin") {
                db.query(
                    "SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'",
                    (countError, countRows) => {
                        if (countError) {
                            console.error(
                                "Admin count error:",
                                countError
                            );

                            return res.status(500).json({
                                message:
                                    "Could not verify administrator count."
                            });
                        }

                        const adminCount =
                            Number(countRows[0].adminCount);

                        if (adminCount <= 1) {
                            return res.status(403).json({
                                message:
                                    "The last administrator cannot be deleted."
                            });
                        }

                        deleteUser(userId, res);
                    }
                );

                return;
            }

            deleteUser(userId, res);
        }
    );
});

function deleteUser(userId, res) {
    db.query(
        "DELETE FROM users WHERE id = ?",
        [userId],
        (error, result) => {
            if (error) {
                console.error("Delete user error:", error);

                return res.status(500).json({
                    message: "Could not delete user."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            res.json({
                message: "User deleted successfully."
            });
        }
    );
}

/* =========================
   PROJECTS
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
