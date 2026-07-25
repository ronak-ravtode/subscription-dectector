import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

DB = r'C:\Users\ronak\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 1. List tables
print("=== TABLES ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
for row in cur.fetchall():
    print(row[0])

# 2. Schema for key tables
for tbl in ['session', 'message', 'part', 'task', 'task_event', 'actor_registry']:
    print(f"\n=== SCHEMA: {tbl} ===")
    try:
        cur.execute(f"SELECT sql FROM sqlite_master WHERE name='{tbl}'")
        r = cur.fetchone()
        if r:
            print(r[0])
    except:
        print("(not found)")

# 3. Sessions for innovahack project
print("\n=== INNOVAHACK SESSIONS ===")
cur.execute("SELECT id, title, directory, time_created FROM session WHERE directory LIKE '%innovahack%' ORDER BY time_created DESC")
for row in cur.fetchall():
    print(row)

# 4. Count messages per session for innovahack
print("\n=== MESSAGE COUNTS (innovahack) ===")
cur.execute("""
    SELECT s.id, s.title, COUNT(m.id) as msg_count
    FROM session s
    LEFT JOIN message m ON m.session_id = s.id
    WHERE s.directory LIKE '%innovahack%'
    GROUP BY s.id
    ORDER BY s.time_created DESC
""")
for row in cur.fetchall():
    print(row)

conn.close()
