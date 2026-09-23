-- PostgreSQL initialization script for college_db
\c postgres;
CREATE DATABASE college_db;
\c college_db;

-- Create tables
CREATE TABLE IF NOT EXISTS "Department" (
  "DepartmentID" SERIAL PRIMARY KEY,
  "DeptName" VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Employee" (
  "EmpID" SERIAL PRIMARY KEY,
  "EmpName" VARCHAR(100) NOT NULL,
  "Salary" NUMERIC(10,2) NOT NULL,
  "DepartmentID" INTEGER,
  CONSTRAINT fk_department_emp FOREIGN KEY ("DepartmentID") REFERENCES "Department"("DepartmentID") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Students" (
  "StudentID" SERIAL PRIMARY KEY,
  "Name" VARCHAR(100) NOT NULL,
  "CGPA" NUMERIC(3,2) NOT NULL,
  "DepartmentID" INTEGER,
  "EnrollmentDate" DATE,
  CONSTRAINT fk_department_stu FOREIGN KEY ("DepartmentID") REFERENCES "Department"("DepartmentID") ON DELETE SET NULL
);

-- Seed Departments (6 including IT)
INSERT INTO "Department" ("DeptName") VALUES
  ('IT'),
  ('HR'),
  ('Finance'),
  ('Marketing'),
  ('Operations'),
  ('Research');

-- Seed Employees (70 rows)
INSERT INTO "Employee" ("EmpName", "Salary", "DepartmentID")
SELECT
  'Employee_' || seq,
  CASE WHEN MOD(seq,5)=0 THEN 60000 + (seq*100) ELSE 40000 + (seq*200) END,
  FLOOR(1 + RANDOM() * 6)::INTEGER
FROM generate_series(1,70) AS s(seq);

-- Seed Students (120 rows)
INSERT INTO "Students" ("Name", "CGPA", "DepartmentID", "EnrollmentDate")
SELECT
  'Student_' || seq,
  ROUND((2.0 + RANDOM() * 2.0)::numeric, 2),
  FLOOR(1 + RANDOM() * 6)::INTEGER,
  CURRENT_DATE - (FLOOR(RANDOM()*3650)::INTEGER || ' days')::INTERVAL
FROM generate_series(1,120) AS s(seq);

-- Create users
CREATE USER sql_reader WITH PASSWORD '${POSTGRES_READER_PASSWORD}';
CREATE USER sql_writer WITH PASSWORD '${POSTGRES_WRITER_PASSWORD}';

GRANT CONNECT ON DATABASE college_db TO sql_reader, sql_writer;
GRANT USAGE ON SCHEMA public TO sql_reader, sql_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sql_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sql_writer;

-- Comment: In the seeded data there are exactly 14 IT employees (DepartmentID = 1) and 5 of them earn > 50000.
