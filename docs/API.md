# REST API Specification

This document provides complete documentation for all REST API endpoints provided by the **GenAI-Powered Natural Language SQL Query Generator and Analyzer** backend.

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`

---

## Table of Contents
1. [Health Check](#1-health-check)
2. [Schema Introspection](#2-schema-introspection)
3. [Query Generation](#3-query-generation)
4. [Query Validation](#4-query-validation)
5. [Impact Analysis](#5-impact-analysis)
6. [Query Explanation](#6-query-explanation)
7. [Query Optimization](#7-query-optimization)
8. [Query Execution](#8-query-execution)
9. [Query History](#9-query-history)
10. [Error Responses & Status Codes](#10-error-responses--status-codes)

---

## 1. Health Check

### `GET /health`
Verifies backend server health and uptime.

#### Request
```http
GET /health HTTP/1.1
Host: localhost:3001
```

#### Response (`200 OK`)
```json
{
  "status": "ok"
}
```

---

## 2. Schema Introspection

### `GET /api/schema`
Retrieves live database schema metadata including tables, column types, nullability, primary keys, and foreign key relationships.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dialect` | `string` | No | `mysql` | Target database engine: `mysql` or `postgres` |

#### Request Example
```http
GET /api/schema?dialect=mysql HTTP/1.1
Host: localhost:3001
```

#### Response (`200 OK`)
```json
{
  "tables": [
    {
      "name": "Department",
      "columns": [
        { "name": "DepartmentID", "type": "int", "nullable": false },
        { "name": "DeptName", "type": "varchar(50)", "nullable": false }
      ],
      "primaryKeys": ["DepartmentID"],
      "foreignKeys": []
    },
    {
      "name": "Employee",
      "columns": [
        { "name": "EmpID", "type": "int", "nullable": false },
        { "name": "EmpName", "type": "varchar(100)", "nullable": false },
        { "name": "Salary", "type": "decimal(10,2)", "nullable": false },
        { "name": "DepartmentID", "type": "int", "nullable": true }
      ],
      "primaryKeys": ["EmpID"],
      "foreignKeys": [
        {
          "column": "DepartmentID",
          "referencedTable": "Department",
          "referencedColumn": "DepartmentID"
        }
      ]
    },
    {
      "name": "Students",
      "columns": [
        { "name": "StudentID", "type": "int", "nullable": false },
        { "name": "StudentName", "type": "varchar(100)", "nullable": false },
        { "name": "CGPA", "type": "decimal(3,2)", "nullable": false },
        { "name": "DepartmentID", "type": "int", "nullable": true },
        { "name": "EnrollmentDate", "type": "date", "nullable": true }
      ],
      "primaryKeys": ["StudentID"],
      "foreignKeys": [
        {
          "column": "DepartmentID",
          "referencedTable": "Department",
          "referencedColumn": "DepartmentID"
        }
      ]
    }
  ]
}
```

---

## 3. Query Generation

### `POST /api/query/generate`
Transforms natural language input into schema-grounded SQL candidates using the Groq LLM inference layer, automatically validating, explaining, and analyzing each candidate.

#### Request Body
```json
{
  "dialect": "mysql",
  "request": "Find top 5 employees with the highest salary in the IT department."
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `dialect` | `string` | Yes | Database dialect (`mysql` or `postgres`) |
| `request` | `string` | Yes | Natural language prompt |

#### Response (`200 OK`)
```json
{
  "intent": "SELECT",
  "candidates": [
    {
      "sql": "SELECT e.EmpID, e.EmpName, e.Salary FROM Employee e JOIN Department d ON e.DepartmentID = d.DepartmentID WHERE d.DeptName = 'IT' ORDER BY e.Salary DESC LIMIT 5;",
      "explanation": "Joins employees with departments, filters for IT, sorts by salary descending, and limits to 5.",
      "tablesUsed": ["Employee", "Department"],
      "columnsUsed": ["EmpID", "EmpName", "Salary", "DepartmentID", "DeptName"],
      "operations": ["SELECT", "JOIN", "WHERE", "ORDER BY", "LIMIT"],
      "assumptions": ["Assumed IT is exact string match for DeptName"],
      "validation": {
        "valid": true,
        "errors": [],
        "warnings": [],
        "operation": "SELECT",
        "riskLevel": "low"
      },
      "impact": {
        "operation": "SELECT",
        "estimatedRows": 5,
        "method": "explain",
        "riskLevel": "low",
        "warnings": [],
        "confirmationRequired": false
      },
      "explain": {
        "narrative": "This query retrieves the top 5 highest paid employees who work in the IT department.",
        "structure": {
          "tables": ["Employee", "Department"],
          "columns": ["e.EmpID", "e.EmpName", "e.Salary", "d.DeptName"],
          "joins": ["JOIN"],
          "filters": ["WHERE clause present"],
          "aggregations": [],
          "orderBy": ["Salary DESC"],
          "limit": "5"
        }
      },
      "optimize": {
        "suggestions": []
      }
    }
  ],
  "historyId": 14
}
```

---

## 4. Query Validation

### `POST /api/query/validate`
Validates SQL syntax, single-statement constraint, schema integrity, and risk level.

#### Request Body
```json
{
  "sql": "SELECT * FROM Employee WHERE Salary > 50000;",
  "dialect": "mysql"
}
```

#### Response (`200 OK`)
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "operation": "SELECT",
  "riskLevel": "low"
}
```

#### Error Example (Invalid Column / Table)
```json
{
  "valid": false,
  "errors": ["Column \"bonus_pct\" does not exist in schema."],
  "warnings": [],
  "operation": "SELECT",
  "riskLevel": "low"
}
```

#### Error Example (Safety Blocked)
```json
{
  "valid": false,
  "errors": ["UPDATE without WHERE clause is blocked."],
  "warnings": [],
  "operation": "UPDATE",
  "riskLevel": "blocked"
}
```

---

## 5. Impact Analysis

### `POST /api/query/impact`
Estimates row counts and calculates operational risk prior to execution.

#### Request Body
```json
{
  "sql": "DELETE FROM Employee WHERE DepartmentID = 4;",
  "dialect": "mysql"
}
```

#### Response (`200 OK`)
```json
{
  "operation": "DELETE",
  "estimatedRows": 5,
  "method": "count",
  "riskLevel": "high",
  "warnings": ["Estimated rows (5) exceed 50% of total rows (6) in the table."],
  "confirmationRequired": true
}
```

---

## 6. Query Explanation

### `POST /api/query/explain`
Returns an AST structural breakdown and a plain-English narrative explanation.

#### Request Body
```json
{
  "sql": "SELECT d.DeptName, COUNT(e.EmpID) FROM Department d JOIN Employee e ON d.DepartmentID = e.DepartmentID GROUP BY d.DeptName;",
  "dialect": "mysql"
}
```

#### Response (`200 OK`)
```json
{
  "narrative": "This query calculates the total count of employees in each department by joining the Department and Employee tables and grouping the results by department name.",
  "structure": {
    "tables": ["Department", "Employee"],
    "columns": ["d.DeptName", "e.EmpID", "d.DepartmentID", "e.DepartmentID"],
    "joins": ["JOIN"],
    "filters": [],
    "aggregations": ["COUNT"],
    "orderBy": [],
    "limit": null
  }
}
```

---

## 7. Query Optimization

### `POST /api/query/optimize`
Performs rule-based checks (`SELECT *`, missing `LIMIT`, non-sargable functions) and `EXPLAIN` query plan analysis.

#### Request Body
```json
{
  "sql": "SELECT * FROM Employee;",
  "dialect": "mysql",
  "askGroqForRewrite": true
}
```

#### Response (`200 OK`)
```json
{
  "suggestions": [
    {
      "type": "rule",
      "message": "Avoid using SELECT *. Specify columns explicitly to reduce data transfer and memory usage."
    },
    {
      "type": "rule",
      "message": "Missing LIMIT clause. On large tables, this might return too many rows."
    }
  ],
  "rewrittenQuery": "SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee LIMIT 100;"
}
```

---

## 8. Query Execution

### `POST /api/query/execute`
Executes SQL in a guarded environment:
- **`SELECT`**: Executed on the reader connection, automatically capped at 500 rows with a 5-second timeout.
- **`INSERT` / `UPDATE` / `DELETE`**: Executed on the writer connection within a transaction. Validates impact estimate against actual affected rows, automatically rolling back on high discrepancies.
- **High-risk queries**: Blocked unless `confirmed: true` is passed.

#### Request Body
```json
{
  "sql": "SELECT EmpID, EmpName, Salary FROM Employee WHERE DepartmentID = 4 LIMIT 5;",
  "dialect": "mysql",
  "confirmed": false
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "rows": [
    { "EmpID": 1, "EmpName": "Alice", "Salary": "62000.00" },
    { "EmpID": 5, "EmpName": "Eve", "Salary": "75000.00" },
    { "EmpID": 12, "EmpName": "Liam", "Salary": "59000.00" },
    { "EmpID": 17, "EmpName": "Quinn", "Salary": "72000.00" },
    { "EmpID": 23, "EmpName": "Wendy", "Salary": "49000.00" }
  ],
  "columns": ["EmpID", "EmpName", "Salary"],
  "rowCount": 5,
  "executionTimeMs": 4
}
```

#### Error Example (`403 Forbidden` - Unconfirmed High Risk)
```json
{
  "message": "High risk query requires confirmation."
}
```

---

## 9. Query History

### `GET /api/history`
Retrieves past query generations, execution statuses, and latencies.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | `number` | No | `20` | Number of records to return |
| `offset` | `number` | No | `0` | Pagination offset |
| `execution_status` | `string` | No | `null` | Filter by status (`SUCCESS`, `FAILED`, `PENDING`) |
| `database_type` | `string` | No | `null` | Filter by dialect (`mysql`, `postgres`) |

#### Request Example
```http
GET /api/history?limit=10&execution_status=SUCCESS HTTP/1.1
Host: localhost:3001
```

#### Response (`200 OK`)
```json
{
  "history": [
    {
      "id": 14,
      "user_id": 1,
      "prompt": "Find top 5 employees in IT",
      "database_type": "mysql",
      "selected_query": "SELECT * FROM Employee WHERE DepartmentID = 4 LIMIT 5;",
      "execution_status": "SUCCESS",
      "rows_returned": 5,
      "execution_time_ms": 12,
      "created_at": "2026-10-08T16:10:00.000Z"
    }
  ],
  "total": 1
}
```

---

### `GET /api/history/:id`
Retrieves detailed metadata for a specific history record.

#### Response (`200 OK`)
```json
{
  "id": 14,
  "user_id": 1,
  "prompt": "Find top 5 employees in IT",
  "database_type": "mysql",
  "generated_query": "[...]",
  "selected_query": "SELECT * FROM Employee WHERE DepartmentID = 4 LIMIT 5;",
  "execution_status": "SUCCESS",
  "rows_returned": 5,
  "execution_time_ms": 12,
  "created_at": "2026-10-08T16:10:00.000Z"
}
```

---

## 10. Error Responses & Status Codes

| HTTP Status | Meaning | Typical Trigger |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded |
| `400 Bad Request` | Invalid Input | Missing required fields (`dialect`, `request`, `sql`) |
| `403 Forbidden` | Safety Violation | Destructive DDL, unconfirmed high-risk mutation, UPDATE/DELETE without WHERE |
| `404 Not Found` | Resource Not Found | History record not found |
| `429 Too Many Requests`| Rate Limit | Groq API rate limit exceeded |
| `500 Internal Server Error` | Server Failure | Database connection failure or unhandled exception |
| `504 Gateway Timeout` | Timeout | Groq LLM or database query timed out |

#### Standard Error Body Format
```json
{
  "message": "Descriptive error message",
  "details": {}
}
```
