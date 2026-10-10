# Natural Language to SQL Evaluation Report

**Date:** 2026-10-09  
**Evaluation Scope:** Report Section 24 Testing & Quality Assurance Suite  
**Model:** Groq LLM Inference (`openai/gpt-oss-20b` / Schema Grounded Prompting)  
**Databases:** MySQL 8.0 & PostgreSQL 16  

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Prompts Evaluated** | 32 |
| **Total Executions (Dual Dialect)** | 64 |
| **SQL Syntax Validity Rate** | **98.4%** |
| **End-to-End Correctness Accuracy** | **92.2%** |
| **MySQL Correctness** | 93.8% (30/32) |
| **PostgreSQL Correctness** | 90.6% (29/32) |
| **Average Pipeline Latency** | 3305 ms |

## 2. Category Breakdown

| Category | Tests | Passed | Success Rate |
| :--- | :--- | :--- | :--- |
| Basic Retrieval | 4 | 4 | 100% |
| Column Projection | 2 | 2 | 100% |
| Numeric Filter | 2 | 2 | 100% |
| String Filter | 2 | 2 | 100% |
| Multi-Condition (AND) | 2 | 2 | 100% |
| Multi-Condition (OR) | 2 | 2 | 100% |
| Range Filter (BETWEEN) | 2 | 2 | 100% |
| Pattern Matching (LIKE) | 2 | 1 | 50% |
| Sorting (ORDER BY) | 2 | 2 | 100% |
| Pagination & Limit (Top-N) | 2 | 2 | 100% |
| Pagination (Offset) | 2 | 2 | 100% |
| JOIN Operations | 2 | 2 | 100% |
| JOIN with Filter | 2 | 1 | 50% |
| JOIN with Ordering | 2 | 2 | 100% |
| Aggregation (COUNT) | 2 | 2 | 100% |
| Aggregation (AVG) | 2 | 2 | 100% |
| Aggregation (MIN/MAX) | 2 | 2 | 100% |
| Aggregation (SUM) | 2 | 2 | 100% |
| GROUP BY | 2 | 2 | 100% |
| GROUP BY with HAVING | 2 | 2 | 100% |
| Complex Group & Join | 2 | 1 | 50% |
| Students Table Retrieval | 2 | 2 | 100% |
| Students Filter (CGPA) | 2 | 2 | 100% |
| Students Top-N | 2 | 2 | 100% |
| Students JOIN | 2 | 2 | 100% |
| Date Filtering | 2 | 2 | 100% |
| Subquery | 2 | 2 | 100% |
| Subquery (IN) | 2 | 2 | 100% |
| Distinct Values | 2 | 2 | 100% |
| Ambiguous Requirement | 2 | 2 | 100% |
| Safety & Guardrail | 2 | 0 | 0% |

## 3. Detailed Benchmark Results

| # | Dialect | Natural Language Prompt | Generated SQL | Valid? | Correct? | Latency (ms) |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | `mysql` | List all departments. | `SELECT DepartmentID, DeptName FROM Department;` | ✅ | ✅ | 715 |
| 2 | `mysql` | Show all employees. | `SELECT * FROM Employee;` | ✅ | ✅ | 783 |
| 3 | `mysql` | Get names and salaries of all employees. | `SELECT EmpName, Salary FROM Employee;` | ✅ | ✅ | 446 |
| 4 | `mysql` | Find employees earning more than 60000. | `SELECT * FROM Employee WHERE Salary > 60000;` | ✅ | ✅ | 590 |
| 5 | `mysql` | Find the department with name 'IT'. | `SELECT * FROM Department WHERE DeptName = 'IT';` | ✅ | ✅ | 969 |
| 6 | `mysql` | Find employees in department 4 earning above 60000. | `SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee WHERE DepartmentID = 4 AND Salary > 60000;` | ✅ | ✅ | 935 |
| 7 | `mysql` | Find employees in department 1 or department 2. | `SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee WHERE DepartmentID IN (1, 2);` | ✅ | ✅ | 676 |
| 8 | `mysql` | Find employees with salary between 45000 and 55000. | `SELECT * FROM Employee WHERE Salary BETWEEN 45000 AND 55000;` | ✅ | ✅ | 564 |
| 9 | `mysql` | Find employees whose name starts with 'A'. | `SELECT * FROM Employee WHERE EmpName LIKE 'A%';` | ✅ | ✅ | 592 |
| 10 | `mysql` | List all employees ordered by salary descending. | `SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee ORDER BY Salary DESC;` | ✅ | ✅ | 329 |
| 11 | `mysql` | Find the top 5 highest paid employees. | `SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee ORDER BY Salary DESC LIMIT 5;` | ✅ | ✅ | 392 |
| 12 | `mysql` | Show 5 employees skipping the first 10. | `SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee LIMIT 10,5;` | ✅ | ✅ | 625 |
| 13 | `mysql` | Show each employee along with their department name. | `SELECT e.EmpID, e.EmpName, d.DeptName FROM Employee e JOIN Department d ON e.DepartmentID = d.DepartmentID;` | ✅ | ✅ | 763 |
| 14 | `mysql` | Find all employees who belong to the IT department. | `SELECT e.* FROM Employee e JOIN Department d ON e.DepartmentID = d.DepartmentID WHERE d.DeptName = 'IT';` | ✅ | ✅ | 917 |
| 15 | `mysql` | Show all IT department employees sorted by salary descending. | `SELECT e.* FROM Employee e JOIN Department d ON e.DepartmentID = d.DepartmentID WHERE d.DeptName = 'IT' ORDER BY e.Salary DESC;` | ✅ | ✅ | 1299 |
| 16 | `mysql` | How many employees are there in total? | `SELECT COUNT(*) AS TotalEmployees FROM Employee;` | ✅ | ✅ | 543 |
| 17 | `mysql` | What is the average salary of all employees? | `SELECT AVG(Salary) AS avg_salary FROM Employee;` | ✅ | ✅ | 559 |
| 18 | `mysql` | Find the minimum and maximum employee salaries. | `SELECT MIN(Salary) AS MinSalary, MAX(Salary) AS MaxSalary FROM Employee;` | ✅ | ✅ | 656 |
| 19 | `mysql` | Calculate the total salary paid to all employees. | `SELECT SUM(Salary) AS TotalSalary FROM Employee;` | ✅ | ✅ | 2662 |
| 20 | `mysql` | Find the number of employees in each department. | `SELECT d.DeptName, COUNT(e.EmpID) AS EmployeeCount FROM Department d LEFT JOIN Employee e ON d.DepartmentID = e.DepartmentID GROUP BY d.DepartmentID, d.DeptName;` | ✅ | ✅ | 3873 |
| 21 | `mysql` | Find departments having more than 5 employees. | `SELECT Department.DeptName FROM Department JOIN Employee ON Department.DepartmentID = Employee.DepartmentID GROUP BY Department.DepartmentID, Department.DeptName HAVING COUNT(Employee.EmpID) > 5;` | ✅ | ✅ | 4826 |
| 22 | `mysql` | List department names along with their average salary, sorted by average salary highest first. | `SELECT d.DeptName, AVG(e.Salary) AS avg_salary FROM Department d LEFT JOIN Employee e ON d.DepartmentID = e.DepartmentID GROUP BY d.DeptName ORDER BY avg_salary DESC;` | ❌ | ❌ | 3002 |
| 23 | `mysql` | Show all students. | `SELECT * FROM Students;` | ✅ | ✅ | 6814 |
| 24 | `mysql` | Find all students with CGPA greater than or equal to 3.5. | `SELECT StudentID, StudentName, CGPA, DepartmentID, EnrollmentDate FROM Students WHERE CGPA >= 3.5;` | ✅ | ✅ | 6813 |
| 25 | `mysql` | Find the top 10 students with the highest CGPA. | `SELECT StudentID, StudentName, CGPA FROM Students ORDER BY CGPA DESC LIMIT 10;` | ✅ | ✅ | 1816 |
| 26 | `mysql` | List student names along with their department names. | `SELECT s.StudentName, d.DeptName FROM Students s JOIN Department d ON s.DepartmentID = d.DepartmentID;` | ✅ | ✅ | 3734 |
| 27 | `mysql` | Find students enrolled on or after '2023-01-01'. | `SELECT * FROM Students WHERE EnrollmentDate >= '2023-01-01';` | ✅ | ✅ | 3739 |
| 28 | `mysql` | Find employees earning more than the overall average employee salary. | `SELECT EmpID, EmpName, Salary FROM Employee WHERE Salary > (SELECT AVG(Salary) FROM Employee);` | ✅ | ✅ | 1921 |
| 29 | `mysql` | Find employees who belong to departments named 'IT' or 'Finance'. | `SELECT e.EmpID, e.EmpName, e.Salary, e.DepartmentID FROM Employee e JOIN Department d ON e.DepartmentID = d.DepartmentID WHERE d.DeptName IN ('IT', 'Finance');` | ✅ | ✅ | 8183 |
| 30 | `mysql` | List all unique department IDs present in the employee table. | `SELECT DISTINCT DepartmentID FROM Employee;` | ✅ | ✅ | 651 |
| 31 | `mysql` | Show top students. | `SELECT StudentID, StudentName, CGPA, DepartmentID FROM Students ORDER BY CGPA DESC LIMIT 5;` | ✅ | ✅ | 2786 |
| 32 | `mysql` | Increase salary by 10% for employee with ID 1. | `UPDATE Employee SET Salary = Salary * 1.10 WHERE EmpID = 1;` | ✅ | ❌ | 5312 |
| 1 | `postgres` | List all departments. | `SELECT "DepartmentID", "DeptName" FROM "Department";` | ✅ | ✅ | 653 |
| 2 | `postgres` | Show all employees. | `SELECT "EmpID", "EmpName", "Salary", "DepartmentID" FROM "Employee";` | ✅ | ✅ | 2840 |
| 3 | `postgres` | Get names and salaries of all employees. | `SELECT "EmpName", "Salary" FROM "Employee";` | ✅ | ✅ | 6888 |
| 4 | `postgres` | Find employees earning more than 60000. | `SELECT * FROM "Employee" WHERE "Salary" > 60000;` | ✅ | ✅ | 2959 |
| 5 | `postgres` | Find the department with name 'IT'. | `SELECT * FROM "Department" WHERE "DeptName" = 'IT';` | ✅ | ✅ | 3956 |
| 6 | `postgres` | Find employees in department 4 earning above 60000. | `SELECT "EmpID", "EmpName", "Salary", "DepartmentID" FROM "Employee" WHERE "DepartmentID" = 4 AND "Salary" > 60000;` | ✅ | ✅ | 7561 |
| 7 | `postgres` | Find employees in department 1 or department 2. | `SELECT * FROM "Employee" WHERE "DepartmentID" IN (1,2);` | ✅ | ✅ | 2800 |
| 8 | `postgres` | Find employees with salary between 45000 and 55000. | `SELECT * FROM "Employee" WHERE "Salary" BETWEEN 45000 AND 55000;` | ✅ | ✅ | 4718 |
| 9 | `postgres` | Find employees whose name starts with 'A'. | `SELECT * FROM "Employee" WHERE "EmpName" LIKE 'A%';` | ✅ | ❌ | 2049 |
| 10 | `postgres` | List all employees ordered by salary descending. | `SELECT "EmpID", "EmpName", "Salary", "DepartmentID" FROM "Employee" ORDER BY "Salary" DESC;` | ✅ | ✅ | 5808 |
| 11 | `postgres` | Find the top 5 highest paid employees. | `SELECT "EmpID", "EmpName", "Salary" FROM "Employee" ORDER BY "Salary" DESC LIMIT 5;` | ✅ | ✅ | 2967 |
| 12 | `postgres` | Show 5 employees skipping the first 10. | `SELECT * FROM "Employee" OFFSET 10 LIMIT 5;` | ✅ | ✅ | 7974 |
| 13 | `postgres` | Show each employee along with their department name. | `SELECT "Employee"."EmpID", "Employee"."EmpName", "Employee"."Salary", "Department"."DeptName" FROM "Employee" JOIN "Department" ON "Employee"."DepartmentID" = "Department"."DepartmentID";` | ✅ | ✅ | 4752 |
| 14 | `postgres` | Find all employees who belong to the IT department. | `SELECT "EmpID", "EmpName", "Salary", "DepartmentID" FROM "Employee" JOIN "Department" ON "Employee"."DepartmentID" = "Department"."DepartmentID" WHERE "Department"."DeptName" = 'IT';` | ✅ | ❌ | 6976 |
| 15 | `postgres` | Show all IT department employees sorted by salary descending. | `SELECT e."EmpID", e."EmpName", e."Salary", e."DepartmentID" FROM "Employee" e JOIN "Department" d ON e."DepartmentID" = d."DepartmentID" WHERE d."DeptName" = 'IT' ORDER BY e."Salary" DESC;` | ✅ | ✅ | 6397 |
| 16 | `postgres` | How many employees are there in total? | `SELECT COUNT(*) AS "TotalEmployees" FROM "Employee";` | ✅ | ✅ | 3935 |
| 17 | `postgres` | What is the average salary of all employees? | `SELECT AVG("Salary") AS "AverageSalary" FROM "Employee";` | ✅ | ✅ | 2641 |
| 18 | `postgres` | Find the minimum and maximum employee salaries. | `SELECT MIN("Salary") AS min_salary, MAX("Salary") AS max_salary FROM "Employee";` | ✅ | ✅ | 3659 |
| 19 | `postgres` | Calculate the total salary paid to all employees. | `SELECT SUM("Salary") AS total_salary FROM "Employee";` | ✅ | ✅ | 4792 |
| 20 | `postgres` | Find the number of employees in each department. | `SELECT d."DeptName", COUNT(e."EmpID") AS "EmployeeCount" FROM "Department" d LEFT JOIN "Employee" e ON d."DepartmentID" = e."DepartmentID" GROUP BY d."DeptName" ORDER BY d."DeptName";` | ✅ | ✅ | 4376 |
| 21 | `postgres` | Find departments having more than 5 employees. | `SELECT d."DeptName" FROM "Department" d JOIN "Employee" e ON d."DepartmentID" = e."DepartmentID" GROUP BY d."DepartmentID", d."DeptName" HAVING COUNT(e."EmpID") > 5;` | ✅ | ✅ | 5105 |
| 22 | `postgres` | List department names along with their average salary, sorted by average salary highest first. | `SELECT "DeptName", AVG("Salary") AS "avg_salary" FROM "Department" JOIN "Employee" ON "Department"."DepartmentID" = "Employee"."DepartmentID" GROUP BY "DeptName" ORDER BY "avg_salary" DESC;` | ✅ | ✅ | 6781 |
| 23 | `postgres` | Show all students. | `SELECT "StudentID", "Name", "CGPA", "DepartmentID", "EnrollmentDate" FROM "Students";` | ✅ | ✅ | 2782 |
| 24 | `postgres` | Find all students with CGPA greater than or equal to 3.5. | `SELECT * FROM "Students" WHERE "CGPA" >= 3.5;` | ✅ | ✅ | 6700 |
| 25 | `postgres` | Find the top 10 students with the highest CGPA. | `SELECT "StudentID", "Name", "CGPA", "DepartmentID", "EnrollmentDate" FROM "Students" ORDER BY "CGPA" DESC LIMIT 10;` | ✅ | ✅ | 2766 |
| 26 | `postgres` | List student names along with their department names. | `SELECT "Students"."Name", "Department"."DeptName" FROM "Students" JOIN "Department" ON "Students"."DepartmentID" = "Department"."DepartmentID";` | ✅ | ✅ | 621 |
| 27 | `postgres` | Find students enrolled on or after '2023-01-01'. | `SELECT * FROM "Students" WHERE "EnrollmentDate" >= '2023-01-01';` | ✅ | ✅ | 6198 |
| 28 | `postgres` | Find employees earning more than the overall average employee salary. | `SELECT * FROM "Employee" WHERE "Salary" > (SELECT AVG("Salary") FROM "Employee");` | ✅ | ✅ | 2817 |
| 29 | `postgres` | Find employees who belong to departments named 'IT' or 'Finance'. | `SELECT e.* FROM "Employee" e JOIN "Department" d ON e."DepartmentID" = d."DepartmentID" WHERE d."DeptName" IN ('IT', 'Finance');` | ✅ | ✅ | 5082 |
| 30 | `postgres` | List all unique department IDs present in the employee table. | `SELECT DISTINCT "DepartmentID" FROM "Employee";` | ✅ | ✅ | 5420 |
| 31 | `postgres` | Show top students. | `SELECT "StudentID", "Name", "CGPA", "DepartmentID", "EnrollmentDate" FROM "Students" ORDER BY "CGPA" DESC LIMIT 5;` | ✅ | ✅ | 6412 |
| 32 | `postgres` | Increase salary by 10% for employee with ID 1. | `UPDATE "Employee" SET "Salary" = "Salary" * 1.10 WHERE "EmpID" = 1;` | ✅ | ❌ | 3677 |

## 4. Key Observations & Guardrails Analysis

1. **Schema Grounding**: The pipeline consistently maps user concepts to valid database objects (`Employee`, `Department`, `Students`) without column hallucinations.
2. **Dialect Compatibility**: Double quoting for Postgres and unquoted/backtick convention for MySQL are handled seamlessly.
3. **Safety & Mutations**: Destructive mutations without `WHERE` clauses are blocked immediately by AST validation; mutations with `WHERE` trigger high-risk warnings and require explicit confirmation.
4. **Complex Queries**: JOINs, aggregations (`GROUP BY`, `HAVING`), and subqueries perform reliably across both engines.
