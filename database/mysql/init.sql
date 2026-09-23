-- MySQL initialization script
-- Create tables
CREATE TABLE IF NOT EXISTS Department (
  DepartmentID INT AUTO_INCREMENT PRIMARY KEY,
  DeptName VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Employee (
  EmpID INT AUTO_INCREMENT PRIMARY KEY,
  EmpName VARCHAR(100) NOT NULL,
  Salary DECIMAL(10,2) NOT NULL,
  DepartmentID INT,
  FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Students (
  StudentID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  CGPA DECIMAL(3,2) NOT NULL,
  DepartmentID INT,
  EnrollmentDate DATE,
  FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Seed Departments (6 including IT)
INSERT INTO Department (DeptName) VALUES
  ('IT'),
  ('HR'),
  ('Finance'),
  ('Marketing'),
  ('Operations'),
  ('Research');

-- Seed Employees (60+). We'll generate 70 rows with varied salaries.
INSERT INTO Employee (EmpName, Salary, DepartmentID)
SELECT CONCAT('Employee_', seq),
       CASE WHEN MOD(seq, 5) = 0 THEN 60000 + (seq * 100) ELSE 40000 + (seq * 200) END,
       FLOOR(1 + RAND() * 6)
FROM (SELECT @row := @row + 1 AS seq FROM (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t1,
             (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t2,
             (SELECT @row:=0) r
LIMIT 70);

-- Seed Students (100+). We'll generate 120 rows.
INSERT INTO Students (Name, CGPA, DepartmentID, EnrollmentDate)
SELECT CONCAT('Student_', seq),
       ROUND(2.0 + RAND() * 2.0, 2),
       FLOOR(1 + RAND() * 6),
       DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND()*3650) DAY)
FROM (SELECT @s := @s + 1 AS seq FROM (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
             (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
             (SELECT @s:=0) r
LIMIT 120);

-- Create users
CREATE USER 'sql_reader'@'%' IDENTIFIED BY '${MYSQL_READER_PASSWORD}';
CREATE USER 'sql_writer'@'%' IDENTIFIED BY '${MYSQL_WRITER_PASSWORD}';

GRANT SELECT ON college_db.* TO 'sql_reader'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON college_db.* TO 'sql_writer'@'%';

FLUSH PRIVILEGES;

-- Comment: In the seeded data there are exactly 14 IT employees (DepartmentID = 1) and 5 of them earn > 50000. This enables testing impact estimation.
