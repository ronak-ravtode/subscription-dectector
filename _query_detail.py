import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

DB = r'C:\Users\ronak\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Full text from Distill session
print("=== DISTILL SESSION FULL TEXT ===")
cur.execute("""
    SELECT m.id, json_extract(m.data, '$.role') as role,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.text') as text,
           json_extract(p.data, '$.state.output') as tool_output
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e8358ffen67rskQrs3O5s1'
      AND json_extract(m.data, '$.role') = 'assistant'
      AND (json_extract(p.data, '$.type') = 'text' OR json_extract(p.data, '$.type') = 'tool')
    ORDER BY m.time_created, p.time_created
""")
for row in cur.fetchall():
    msg_id, role, ptype, tool, text, tool_output = row
    if ptype == 'text' and text:
        print(f"\n[TEXT] {text[:2000]}")
    elif ptype == 'tool' and tool_output:
        print(f"\n[TOOL:{tool}] {tool_output[:1500]}")

# Check all sessions across all projects for any related work
print("\n\n=== ALL SESSIONS (last 30 days) ===")
cur.execute("""
    SELECT id, title, directory, time_created 
    FROM session 
    WHERE time_created > (strftime('%s','now') * 1000 - 30*24*60*60*1000)
    ORDER BY time_created DESC
""")
for row in cur.fetchall():
    print(row)

# Check if there are any tasks
print("\n\n=== ALL TASKS ===")
cur.execute("SELECT * FROM task ORDER BY created_at DESC LIMIT 20")
for row in cur.fetchall():
    print(row)

conn.close()
