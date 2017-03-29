-- Up
CREATE TABLE Users (username TEXT PRIMARY KEY, email TEXT, password TEXT NOT NULL);
CREATE TABLE Sessions (sessionId TEXT PRIMARY KEY, expiration TEXT, lastTouched TEXT);

-- Down
DROP TABLE Users;
DROP TABLE Sessions;