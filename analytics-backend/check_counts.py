import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
db.executescript(Path(__file__).with_name('schema.sql').read_text())
rows = [('one', 'visitor-a', '2026-10-12'), ('two', 'visitor-a', '2026-10-14'), ('three', 'visitor-b', '2026-10-14'), ('four', 'visitor-c', '2026-09-30')]
db.executemany('INSERT OR IGNORE INTO visits VALUES (?, ?, ?)', rows + [rows[0]])
query = 'SELECT COUNT(DISTINCT visitor), COUNT(*) FROM visits WHERE day >= ? AND day <= ?'
assert db.execute(query, ('2026-10-14', '2026-10-14')).fetchone() == (2, 2)
assert db.execute(query, ('2026-10-12', '2026-10-14')).fetchone() == (2, 3)
assert db.execute(query, ('2026-10-01', '2026-10-14')).fetchone() == (2, 3)
assert db.execute('SELECT COUNT(DISTINCT visitor), COUNT(*) FROM visits').fetchone() == (3, 4)
print('Distinct counts and idempotency passed.')
