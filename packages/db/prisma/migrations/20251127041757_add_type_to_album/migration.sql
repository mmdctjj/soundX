-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "cover" TEXT,
    "year" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MUSIC'
);
INSERT INTO "new_Album" ("artist", "cover", "id", "name", "year") SELECT "artist", "cover", "id", "name", "year" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
