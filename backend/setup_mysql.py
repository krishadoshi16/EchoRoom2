import pymysql
import os

DB_HOST = "127.0.0.1"
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "echoroom"
SQL_DUMP_FILE = r"C:\Users\Krisha\Downloads\EchoRoom\EchoRoom\echoroom.sql"

def run():
    print(f"Connecting to MySQL server at {DB_HOST}...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=3307,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return

    try:
        with connection.cursor() as cursor:
            print(f"Creating database '{DB_NAME}' if it doesn't exist...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            cursor.execute(f"USE {DB_NAME};")
            
            print(f"Reading SQL file from {SQL_DUMP_FILE}...")
            with open(SQL_DUMP_FILE, 'r', encoding='utf-8') as f:
                sql_statements = f.read()

            # PyMySQL doesn't support executing entire dumps containing multiple statements well natively unless split
            print("Importing SQL dump into the database. This may take a moment...")
            
            # Basic splitting of statements (Warning: naïve splitting by semicolon assumes no semicolons in strings!)
            statements = []
            delimiter = ';'
            statement = ''
            for line in sql_statements.splitlines():
                if line.strip().startswith('--') or line.strip().startswith('/*'):
                    continue
                if not line.strip():
                    continue
                statement += ' ' + line
                if statement.rstrip().endswith(delimiter):
                    statements.append(statement)
                    statement = ''
            
            for index, stmt in enumerate(statements):
                try:
                    cursor.execute(stmt)
                except Exception as stmt_e:
                    print(f"Warning: Failed to execute statement #{index}: {stmt[:50]}... Error: {stmt_e}")
            
            connection.commit()
            print("SQL import completed successfully!")
            
    finally:
        connection.close()

if __name__ == '__main__':
    run()
