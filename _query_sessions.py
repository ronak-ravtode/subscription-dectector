import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

DB = r'C:\Users\ronak\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 1. Project table
print("=== PROJECTS ===")
cur.execute("SELECT * FROM project")
for row in cur.fetchall():
    print(row)

# 2. Greeting session messages
print("\n=== GREETING SESSION (ses_0671e83ccffeenCYJv6bpcOrt0) ===")
cur.execute("""
    SELECT m.id, m.agent_id, json_extract(m.data, '$.role') as role, 
           m.time_created,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           CASE WHEN json_extract(p.data, '$.type') = 'text' 
                THEN substr(json_extract(p.data, '$.text'), 1, 500)
                WHEN json_extract(p.data, '$.type') = 'tool' 
                THEN substr(json_extract(p.data, '$.state.input'), 1, 200) || ' -> ' || substr(json_extract(p.data, '$.state.output'), 1, 200)
                ELSE NULL END as content_preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e83ccffeenCYJv6bpcOrt0'
    ORDER BY m.time_created, p.time_created
""")
for row in cur.fetchall():
    print(row)

# 3. Distill session messages
print("\n=== DISTILL SESSION (ses_0671e8358ffen67rskQrs3O5s1) ===")
cur.execute("""
    SELECT m.id, m.agent_id, json_extract(m.data, '$.role') as role, 
           m.time_created,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           CASE WHEN json_extract(p.data, '$.type') = 'text' 
                THEN substr(json_extract(p.data, '$.text'), 1, 800)
                WHEN json_extract(p.data, '$.type') = 'tool' 
                THEN substr(json_extract(p.data, '$.state.output'), 1, 400)
                ELSE NULL END as content_preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e8358ffen67rskQrs3O5s1'
    ORDER BY m.time_created, p.time_created
""")
for row in cur.fetchall():
    print(row)

# 4. Current Dream session messages
print("\n=== DREAM SESSION (ses_0671e8362ffeNODr3pZ7uPV5d2) ===")
cur.execute("""
    SELECT m.id, m.agent_id, json_extract(m.data, '$.role') as role, 
           m.time_created,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           CASE WHEN json_extract(p.data, '$.type') = 'text' 
                THEN substr(json_extract(p.data, '$.text'), 1, 800)
                WHEN json_extract(p.data, '$.type') = 'tool' 
                THEN substr(json_extract(p.data, '$.state.output'), 1, 400)
                ELSE NULL END as content_preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_0671e8362ffeNODr3pZ7uPV5d2'
    ORDER BY m.time_created, p.time_created
""")
for row in cur.fetchall():
    print(row)

# 5. Tasks for all innovahack sessions
print("\n=== TASKS (innovahack) ===")
cur.execute("""
    SELECT t.id, t.session_id, t.status, t.summary, t.created_at, t.last_event_at, t.ended_at
    FROM task t
    JOIN session s ON t.session_id = s.id
    WHERE s.directory LIKE '%innovahack%'
    ORDER BY t.created_at DESC
""")
for row in cur.fetchall():
    print(row)

# 6. Task events
print("\n=== TASK EVENTS (innovahack) ===")
cur.execute("""
    SELECT te.id, te.session_id, te.task_id, te.kind, te.summary, te.at
    FROM task_event te
    JOIN session s ON te.session_id = s.id
    WHERE s.directory LIKE '%innovahack%'
    ORDER BY te.at DESC
""")
for row in cur.fetchall():
    print(row)

# 7. Actor registry
print("\n=== ACTORS (innovahack) ===")
cur.execute("""
    SELECT ar.session_id, ar.actor_id, ar.mode, ar.status, ar.agent, ar.description, ar.background, ar.turn_count, ar.lifecycle
    FROM actor_registry ar
    JOIN session s ON ar.session_id = s.id
    WHERE s.directory LIKE '%innovahack%'
""")
for row in cur.fetchall():
    print(row)

conn.close()
