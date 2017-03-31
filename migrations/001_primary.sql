-- Up
CREATE TABLE Users (username TEXT PRIMARY KEY, email TEXT, password TEXT NOT NULL);
CREATE TABLE Sessions (sessionId TEXT PRIMARY KEY, expiration TEXT, lastTouched TEXT);
CREATE TABLE Games (gameId INTEGER PRIMARY KEY, hostUser TEXT NOT NULL, maxPlayers INTEGER NOT NULL, started INTEGER NOT NULL);
CREATE TABLE UsersInGames (gameId_username TEXT PRIMARY KEY, gameId TEXT NOT NULL, username TEXT NOT NULL);
CREATE INDEX gameId_UsersInGames_index ON UsersInGames (gameId);

-- Down
DROP TABLE Users;
DROP TABLE Sessions;
DROP TABLE Games;
DROP TABLE UsersInGames;