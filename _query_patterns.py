import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

DB = r'C:\Users\ronak\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# All sessions grouped by project (directory)
print("=== SESSIONS BY PROJECT ===")
cur.execute("""
    SELECT directory, COUNT(*) as session_count, 
           MIN(time_created) as first_session, 
           MAX(time_created) as last_session
    FROM session 
    GROUP BY directory 
    ORDER BY last_session DESC
""")
for row in cur.fetchall():
    print(row)

# Full text from Dream session (this session) for any user rules/decisions
print("\n=== DREAM SESSION USER MESSAGES ===")
cur.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e8362ffeNODr3pZ7uPV5d2'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created
""")
for row in cur.fetchall():
    if row[0]:
        print(f"USER: {row[0][:500]}")

# Full text from Distill session user messages
print("\n=== DISTILL SESSION USER MESSAGES ===")
cur.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e8358ffen67rskQrs3O5s1'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created
""")
for row in cur.fetchall():
    if row[0]:
        print(f"USER: {row[0][:500]}")

# Greeting session user message
print("\n=== GREETING SESSION USER MESSAGES ===")
cur.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e83ccffeenCYJv6bpcOrt0'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created
""")
for row in cur.fetchall():
    if row[0]:
        print(f"USER: {row[0][:500]}")

# Check the redrob_agent_starter sessions for any relevant patterns
print("\n=== REDROB SESSIONS ===")
cur.execute("""
    SELECT s.id, s.title, s.directory, s.time_created,
           COUNT(m.id) as msg_count
    FROM session s
    LEFT JOIN message m ON m.session_id = s.id
    WHERE s.directory LIKE '%redrob%'
    GROUP BY s.id
    ORDER BY s.time_created DESC
""")
for row in cur.fetchall():
    print(row)

conn.close()
