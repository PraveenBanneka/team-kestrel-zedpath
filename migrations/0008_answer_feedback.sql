-- ZedPath D1 migration 0008: feedback on Ask ZedPath answers (CR-004, product owner's GO 2026-10-11).
-- Not mistake_report (0001): that table reports a stored, cited FACT (fact_id is required); an AI answer is not one.
-- Privacy: sent only when the student taps "Helpful" or "Report a wrong answer", after the screen says the question
-- and answer go to the ZedPath team. No account, device or IP is stored with it.
CREATE TABLE answer_feedback (
  feedback_id  INTEGER PRIMARY KEY,
  rating       TEXT NOT NULL CHECK (rating IN ('HELPFUL','WRONG')),
  question     TEXT NOT NULL CHECK (length(question) BETWEEN 2 AND 500),
  answer       TEXT NOT NULL CHECK (length(answer) BETWEEN 1 AND 4000),
  pages        TEXT NOT NULL CHECK (json_valid(pages)),                 -- the handbook pages the answer cited, e.g. [87,151]
  note         TEXT CHECK (note IS NULL OR length(note) <= 500),
  lang         TEXT NOT NULL CHECK (lang IN ('en','si','ta')),
  created_at   TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','CHECKED'))
) STRICT;
CREATE INDEX idx_answer_feedback_open ON answer_feedback(created_at) WHERE state = 'OPEN';
