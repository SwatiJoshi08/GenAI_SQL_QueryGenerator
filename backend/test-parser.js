"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_sql_parser_1 = require("node-sql-parser");
const parser = new node_sql_parser_1.Parser();
const sql = "SELECT a, sum(b) FROM t1 JOIN t2 ON t1.id = t2.id WHERE c = 1 GROUP BY a ORDER BY a DESC LIMIT 10";
const ast = parser.astify(sql, { database: 'MySQL' });
console.log(JSON.stringify(ast, null, 2));
