-- This is an empty migration.

-- Seed data for AUT (Alternate Uses Test)
INSERT INTO "aut_questions" ("object") VALUES
('paperclip'),
('brick'),
('bottle'),
('shoe'),
('towel');

-- Seed data for RAT (Remote Associates Test)
INSERT INTO "rat_questions" ("word1", "word2", "word3") VALUES
('cottage', 'swiss', 'cake'),
('cream', 'skate', 'water'),
('show', 'life', 'row'),
('night', 'wrist', 'stop'),
('sore', 'shoulder', 'sweat');