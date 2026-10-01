USE l3_sod_project;

ALTER TABLE users
ADD COLUMN role ENUM('student', 'admin') NOT NULL DEFAULT 'student'
AFTER password;
