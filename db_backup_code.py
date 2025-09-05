import subprocess
import os
import datetime


def backup_postgres_db(host, db_name, user, password, backup_dir):
    os.environ["PGPASSWORD"] = password

    # Get the current date and time for naming the backup file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{db_name}_backup_{timestamp}.dump"
    backup_path = os.path.join(backup_dir, backup_filename)
    command = [
        "/opt/homebrew/opt/postgresql@16/bin/pg_dump",
        "-h",
        host,
        "-U",
        user,
        "-F",
        "c",  # Custom format for the backup file (recommended)
        "-b",  # Include large objects (blobs) in the dump
        "-v",  # Verbose output (for debugging purposes)
        "-f",
        backup_path,  # Output file path
        db_name,  # Database name
    ]

    try:
        # Run the command and capture the output
        subprocess.run(command, check=True, env=os.environ)
        print(f"Backup of '{db_name}' database successfully created at: {backup_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred during backup: {e}")
    finally:
        # Clean up by unsetting the password environment variable
        del os.environ["PGPASSWORD"]


# Example usage
if __name__ == "__main__":
    host = "139.5.189.170"
    db_name = "vgt_prod_db"
    user = "vgt_admin"
    password = "VGT#Admin#Prod#0602"
    backup_dir = "prod_db_backups"
    os.makedirs(backup_dir, exist_ok=True)

    backup_postgres_db(host, db_name, user, password, backup_dir)
