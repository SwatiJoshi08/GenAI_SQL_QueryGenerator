#!/bin/bash
set -e

# This script creates the sql_reader and sql_writer MySQL users using environment variables.
# It is executed by the MySQL Docker entrypoint after init.sql has been processed.

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE USER IF NOT EXISTS 'sql_reader'@'%' IDENTIFIED BY '${MYSQL_READER_PASSWORD}';
    GRANT SELECT ON college_db.* TO 'sql_reader'@'%';

    CREATE USER IF NOT EXISTS 'sql_writer'@'%' IDENTIFIED BY '${MYSQL_WRITER_PASSWORD}';
    GRANT SELECT, INSERT, UPDATE, DELETE ON college_db.* TO 'sql_writer'@'%';
EOSQL

set -e

# This script creates the sql_reader and sql_writer MySQL users using environment variables.
# It is executed by the MySQL Docker entrypoint after init.sql has been processed.

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE USER IF NOT EXISTS 'sql_reader'@'%' IDENTIFIED BY '${MYSQL_READER_PASSWORD}';
    GRANT SELECT ON college_db.* TO 'sql_reader'@'%';

    CREATE USER IF NOT EXISTS 'sql_writer'@'%' IDENTIFIED BY '${MYSQL_WRITER_PASSWORD}';
    GRANT SELECT, INSERT, UPDATE, DELETE ON college_db.* TO 'sql_writer'@'%';
EOSQL
