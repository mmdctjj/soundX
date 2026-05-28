-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "cover" TEXT,
    "year" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME
);

-- CreateTable
CREATE TABLE "AudiobookCollection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cover" TEXT,
    "type" TEXT NOT NULL DEFAULT 'AUDIOBOOK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudiobookCollectionAlbum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "collectionId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("collectionId") REFERENCES "AudiobookCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Device" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    FOREIGN KEY ("parentId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mv" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "artist" TEXT,
    "album" TEXT,
    "cover" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileModifiedAt" DATETIME,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME,
    "artistId" INTEGER,
    "albumId" INTEGER,
    "trackId" INTEGER,
    FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "cover" TEXT,
    "duration" INTEGER,
    "lyrics" TEXT,
    "index" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'MUSIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileModifiedAt" DATETIME,
    "episodeNumber" INTEGER DEFAULT 0,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trashedAt" DATETIME,
    "artistId" INTEGER,
    "albumId" INTEGER,
    "folderId" INTEGER,
    "fileName" TEXT,
    "relativePath" TEXT,
    "fileCreatedAt" DATETIME,
    "scanOrder" INTEGER,
    FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT
);

-- CreateTable
CREATE TABLE "UserAlbumHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "listenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAlbumLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAudiobookHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "listenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAudiobookLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTrackHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "listenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "deviceName" TEXT NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "isSyncMode" BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTrackLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlaylistToTrack" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("B") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("A") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tts_chapter_task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_msg" TEXT,
    "output_path" TEXT,
    FOREIGN KEY ("task_id") REFERENCES "tts_task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tts_task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "book_name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "file_path" TEXT NOT NULL DEFAULT '',
    "total_chapters" INTEGER NOT NULL,
    "completed_chapters" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "options" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'edge',
    "voice" TEXT NOT NULL DEFAULT 'zh-CN-XiaoxiaoNeural',
    "speed" REAL NOT NULL DEFAULT 1.0
);

-- CreateTable
CREATE TABLE "tts_user_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "engine_name" TEXT NOT NULL,
    "config_json" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Album_status_idx" ON "Album"("status" ASC);

-- CreateIndex
CREATE INDEX "Artist_status_idx" ON "Artist"("status" ASC);

-- CreateIndex
CREATE INDEX "AudiobookCollection_type_idx" ON "AudiobookCollection"("type" ASC);

-- CreateIndex
CREATE INDEX "AudiobookCollection_userId_idx" ON "AudiobookCollection"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AudiobookCollectionAlbum_collectionId_albumId_key" ON "AudiobookCollectionAlbum"("collectionId" ASC, "albumId" ASC);

-- CreateIndex
CREATE INDEX "AudiobookCollectionAlbum_collectionId_order_idx" ON "AudiobookCollectionAlbum"("collectionId" ASC, "order" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Folder_path_key" ON "Folder"("path" ASC);

-- CreateIndex
CREATE INDEX "Mv_status_idx" ON "Mv"("status" ASC);

-- CreateIndex
CREATE INDEX "Mv_fileHash_idx" ON "Mv"("fileHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key" ASC);

-- CreateIndex
CREATE INDEX "Track_status_idx" ON "Track"("status" ASC);

-- CreateIndex
CREATE INDEX "Track_fileHash_idx" ON "Track"("fileHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserAudiobookHistory_userId_trackId_key" ON "UserAudiobookHistory"("userId" ASC, "trackId" ASC);

-- CreateIndex
CREATE INDEX "_PlaylistToTrack_B_index" ON "_PlaylistToTrack"("B" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "_PlaylistToTrack_AB_unique" ON "_PlaylistToTrack"("A" ASC, "B" ASC);

