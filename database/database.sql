CREATE DATABASE IF NOT EXISTS l3_sod_project;
USE l3_sod_project;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO projects (name, description, status) VALUES
('JavaScript Project', 'Focused on using JavaScript to create interactive web applications and practise variables, functions, conditions, loops, and events.', 'Completed'),
('Graphic Design Project', 'Focused on creating visual designs such as posters, banners, logos, and digital graphics using graphic design tools.', 'Completed'),
('UI/UX Project', 'Focused on application appearance and user experience, including layouts, navigation, buttons, forms, and user-friendly interfaces.', 'Completed'),
('Version Control Project', 'Focused on using Git and GitHub for source code management, tracking changes, repositories, branches, and collaboration.', 'Completed');
