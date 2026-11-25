SET @has_avatar_image = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'avatar_image'
);
SET @avatar_image_sql = IF(@has_avatar_image = 0,
  'ALTER TABLE users ADD COLUMN avatar_image LONGBLOB NULL AFTER is_active', 'SELECT 1');
PREPARE avatar_image_stmt FROM @avatar_image_sql;
EXECUTE avatar_image_stmt;
DEALLOCATE PREPARE avatar_image_stmt;

SET @has_avatar_mime = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'avatar_mime'
);
SET @avatar_mime_sql = IF(@has_avatar_mime = 0,
  'ALTER TABLE users ADD COLUMN avatar_mime VARCHAR(100) NULL AFTER avatar_image', 'SELECT 1');
PREPARE avatar_mime_stmt FROM @avatar_mime_sql;
EXECUTE avatar_mime_stmt;
DEALLOCATE PREPARE avatar_mime_stmt;

SET @has_avatar_updated_at = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'avatar_updated_at'
);
SET @avatar_updated_sql = IF(@has_avatar_updated_at = 0,
  'ALTER TABLE users ADD COLUMN avatar_updated_at TIMESTAMP NULL AFTER avatar_mime', 'SELECT 1');
PREPARE avatar_updated_stmt FROM @avatar_updated_sql;
EXECUTE avatar_updated_stmt;
DEALLOCATE PREPARE avatar_updated_stmt;
