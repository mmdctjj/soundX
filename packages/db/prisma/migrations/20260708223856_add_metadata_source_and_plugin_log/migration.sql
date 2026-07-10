-- CreateTable
CREATE TABLE "PluginLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pluginId" TEXT NOT NULL,
    "pluginName" TEXT,
    "targetPath" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "cover" TEXT,
    "year" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME,
    "metadataSource" TEXT NOT NULL DEFAULT 'EMBEDDED',
    "metadataProvider" TEXT
);
INSERT INTO "new_Album" ("artist", "cover", "id", "name", "status", "trashedAt", "type", "year") SELECT "artist", "cover", "id", "name", "status", "trashedAt", "type", "year" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
CREATE INDEX "Album_status_idx" ON "Album"("status");
CREATE TABLE "new_Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME,
    "metadataSource" TEXT NOT NULL DEFAULT 'EMBEDDED',
    "metadataProvider" TEXT
);
INSERT INTO "new_Artist" ("avatar", "id", "name", "status", "trashedAt", "type") SELECT "avatar", "id", "name", "status", "trashedAt", "type" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE INDEX "Artist_status_idx" ON "Artist"("status");
CREATE TABLE "new_Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fileName" TEXT,
    "relativePath" TEXT,
    "path" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "cover" TEXT,
    "duration" INTEGER,
    "lyrics" TEXT,
    "index" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileCreatedAt" DATETIME,
    "fileModifiedAt" DATETIME,
    "scanOrder" INTEGER,
    "episodeNumber" INTEGER DEFAULT 0,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME,
    "transcodedPath" TEXT,
    "metadataSource" TEXT NOT NULL DEFAULT 'EMBEDDED',
    "metadataProvider" TEXT,
    "artistId" INTEGER,
    "albumId" INTEGER,
    "folderId" INTEGER,
    CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("album", "albumId", "artist", "artistId", "cover", "createdAt", "duration", "episodeNumber", "fileCreatedAt", "fileHash", "fileModifiedAt", "fileName", "folderId", "id", "index", "lyrics", "name", "path", "relativePath", "scanOrder", "status", "transcodedPath", "trashedAt", "type") SELECT "album", "albumId", "artist", "artistId", "cover", "createdAt", "duration", "episodeNumber", "fileCreatedAt", "fileHash", "fileModifiedAt", "fileName", "folderId", "id", "index", "lyrics", "name", "path", "relativePath", "scanOrder", "status", "transcodedPath", "trashedAt", "type" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE INDEX "Track_fileHash_idx" ON "Track"("fileHash");
CREATE INDEX "Track_status_idx" ON "Track"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PluginLog_targetPath_idx" ON "PluginLog"("targetPath");

-- CreateIndex
CREATE INDEX "PluginLog_pluginId_idx" ON "PluginLog"("pluginId");

-- CreateIndex
CREATE INDEX "PluginLog_createdAt_idx" ON "PluginLog"("createdAt");
