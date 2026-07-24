-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "source" TEXT NOT NULL DEFAULT 'FILE',
    "tags" TEXT,
    "artistId" INTEGER,
    "albumId" INTEGER,
    "folderId" INTEGER,
    CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("album", "albumId", "artist", "artistId", "cover", "createdAt", "duration", "episodeNumber", "fileCreatedAt", "fileHash", "fileModifiedAt", "fileName", "folderId", "id", "index", "lyrics", "metadataProvider", "metadataSource", "name", "path", "relativePath", "scanOrder", "status", "tags", "transcodedPath", "trashedAt", "type") SELECT "album", "albumId", "artist", "artistId", "cover", "createdAt", "duration", "episodeNumber", "fileCreatedAt", "fileHash", "fileModifiedAt", "fileName", "folderId", "id", "index", "lyrics", "metadataProvider", "metadataSource", "name", "path", "relativePath", "scanOrder", "status", "tags", "transcodedPath", "trashedAt", "type" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE INDEX "Track_fileHash_idx" ON "Track"("fileHash");
CREATE INDEX "Track_status_idx" ON "Track"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
