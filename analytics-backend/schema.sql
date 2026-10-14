CREATE TABLE IF NOT EXISTS visits (
  event TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  day TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_day_visitor ON visits (day, visitor);
CREATE INDEX IF NOT EXISTS visits_visitor ON visits (visitor);
