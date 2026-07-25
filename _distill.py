import sqlite3, json, sys, time, io
from collections import Counter, defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DB = r'C:\Users\ronak\.local\share\mimocode\mimocode.db'
db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row

def q(sql, params=()):
    return db.execute(sql, params).fetchall()

def safe(s, maxlen=150):
    if not s: return '(none)'
    return str(s).replace('\n', ' ').replace('\r', '').replace('\t', ' ')[:maxlen]

# Get all sessions
sessions = q("SELECT id, title, directory, time_created FROM session ORDER BY time_created DESC")

# --- User messages per session (from parts) ---
print("=" * 70)
print("USER MESSAGES PER SESSION (from part table)")
print("=" * 70)

all_user_texts = []

for s in sessions:
    sid = s['id']
    ts = s['time_created']
    t_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(ts/1000)) if ts else '?'
    
    user_parts = q("""
        SELECT json_extract(p.data, '$.text') as text
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND length(json_extract(p.data, '$.text')) > 3
        ORDER BY m.time_created ASC
    """, (sid,))
    
    if not user_parts:
        continue
    
    print(f"\n--- [{sid[:20]}] {t_str} | {safe(s['title'], 50)} ---")
    print(f"    Dir: {safe(s['directory'], 60)}")
    for i, p in enumerate(user_parts):
        txt = safe(p['text'], 150)
        print(f"    [{i}]: {txt}")
        all_user_texts.append({'text': p['text'] or '', 'session_id': sid, 'dir': s['directory'], 'title': s['title']})

# --- Pattern analysis ---
print("\n" + "=" * 70)
print("PATTERN ANALYSIS: WHAT DOES USER REPEATEDLY ASK FOR?")
print("=" * 70)

patterns = Counter()
for item in all_user_texts:
    c = item['text'].lower()
    if 'session summary' in c or 'overarching goal' in c:
        patterns['Session summary/context handoff'] += 1
    if 'gssoc' in c:
        patterns['GSSoC project work'] += 1
    if 'issue' in c and ('check' in c or 'find' in c or 'scan' in c or 'give me' in c):
        patterns['Issue scanning/finding'] += 1
    if 'bug' in c or 'fix' in c:
        patterns['Bug fixing'] += 1
    if 'feature' in c:
        patterns['Feature implementation'] += 1
    if 'understand' in c or 'explain' in c or 'explaintion' in c:
        patterns['Code understanding/explanation'] += 1
    if 'security' in c or 'password' in c or 'validation' in c:
        patterns['Security review'] += 1
    if 'create' in c or 'build' in c or 'make' in c:
        patterns['Create/build new'] += 1
    if 'hackathon' in c or 'mvp' in c:
        patterns['Hackathon/MVP building'] += 1
    if 'service worker' in c or 'cache' in c or 'offline' in c:
        patterns['PWA/service worker'] += 1
    if 'nodemon' in c or 'error' in c:
        patterns['Runtime error debugging'] += 1
    if 'edit' in c and 'save' in c:
        patterns['Edit-save UI bugs'] += 1
    if 'subtitle' in c or 'not showing' in c or 'not working' in c:
        patterns['UI display bugs'] += 1
    if 'codebase' in c and ('check' in c or 'scan' in c):
        patterns['Codebase scanning'] += 1
    if 'traveloop' in c:
        patterns['Traveloop hackathon'] += 1
    if 'ecofinds' in c:
        patterns['EcoFinds hackathon'] += 1
    if 'piperchat' in c or 'piper chat' in c:
        patterns['PiperChat project'] += 1
    if 'distill' in c or 'dream' in c:
        patterns['Auto distill/dream commands'] += 1
    if 'import' in c and ('express' in c or 'from' in c):
        patterns['Paste code + ask'] += 1

print("\n  Pattern frequency:")
for p, cnt in patterns.most_common():
    print(f"    {cnt:>3}x {p}")

# --- Assistant tool sequences per session ---
print("\n" + "=" * 70)
print("ASSISTANT TOOL SEQUENCES (first 10 tools per session)")
print("=" * 70)

for s in sessions[:20]:
    sid = s['id']
    tools = q("""
        SELECT json_extract(p.data, '$.tool') as tool
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'tool'
        ORDER BY m.time_created ASC
        LIMIT 12
    """, (sid,))
    
    if not tools:
        continue
    
    tool_seq = ' -> '.join([t['tool'] for t in tools if t['tool']])
    print(f"  [{sid[:18]}] {safe(s['title'], 35)}: {tool_seq}")

# --- Multi-session projects ---
print("\n" + "=" * 70)
print("MULTI-SESSION PROJECTS (context handoff pattern)")
print("=" * 70)

dir_sessions = defaultdict(list)
for s in sessions:
    d = s['directory']
    user_parts = q("""
        SELECT json_extract(p.data, '$.text') as text
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND length(json_extract(p.data, '$.text')) > 3
        ORDER BY m.time_created ASC
        LIMIT 1
    """, (s['id'],))
    first_msg = safe(user_parts[0]['text'], 80) if user_parts else '(no msg)'
    dir_sessions[d].append({
        'id': s['id'],
        'title': safe(s['title'], 40),
        'first_msg': first_msg,
        'ts': s['time_created']
    })

for d, slist in sorted(dir_sessions.items(), key=lambda x: -len(x[1])):
    if len(slist) >= 2:
        print(f"\n  {d} ({len(slist)} sessions):")
        for s in sorted(slist, key=lambda x: x['ts']):
            t_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(s['ts']/1000))
            print(f"    {t_str}: {s['first_msg'][:90]}")

# --- Specific repeated workflow: GSSoC issue scanning ---
print("\n" + "=" * 70)
print("GSSoC ISSUE SCANNING WORKFLOW (detailed)")
print("=" * 70)

gssoc_sessions = [s for s in sessions if s['directory'] and 'GSSOC' in s['directory']]
for s in gssoc_sessions:
    sid = s['id']
    user_parts = q("""
        SELECT json_extract(p.data, '$.text') as text
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND length(json_extract(p.data, '$.text')) > 3
        ORDER BY m.time_created ASC
    """, (sid,))
    
    tools = q("""
        SELECT json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.state.input'), 1, 100) as inp
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'tool'
        ORDER BY m.time_created ASC
        LIMIT 10
    """, (sid,))
    
    print(f"\n  [{sid[:18]}] {safe(s['title'], 40)}")
    for p in user_parts:
        print(f"    User: {safe(p['text'], 120)}")
    tool_seq = ' -> '.join([t['tool'] for t in tools if t['tool']])
    print(f"    Tools: {tool_seq}")

# --- Repeated file read patterns (what files get read across sessions?) ---
print("\n" + "=" * 70)
print("MOST READ FILES (across all sessions)")
print("=" * 70)
rows = q("""
    SELECT json_extract(p.data, '$.state.input') as inp, count(*) as n,
           count(DISTINCT m.session_id) as sessions
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'read'
    GROUP BY inp
    ORDER BY n DESC
    LIMIT 20
""")
for r in rows:
    print(f"  x{r['n']} ({r['sessions']} sess): {safe(r['inp'], 130)}")

# --- Repeated grep patterns ---
print("\n" + "=" * 70)
print("MOST USED GREP PATTERNS")
print("=" * 70)
rows = q("""
    SELECT json_extract(p.data, '$.state.input') as inp, count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'grep'
    GROUP BY inp
    ORDER BY n DESC
    LIMIT 15
""")
for r in rows:
    print(f"  x{r['n']}: {safe(r['inp'], 130)}")

db.close()
print("\n=== FULL ANALYSIS COMPLETE ===")
