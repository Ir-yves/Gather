SET @has_recording_egress_id = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'livestreams' AND column_name = 'recording_egress_id'
);
SET @recording_egress_sql = IF(@has_recording_egress_id = 0,
  'ALTER TABLE livestreams ADD COLUMN recording_egress_id VARCHAR(64) NULL AFTER ended_at', 'SELECT 1');
PREPARE recording_egress_stmt FROM @recording_egress_sql;
EXECUTE recording_egress_stmt;
DEALLOCATE PREPARE recording_egress_stmt;

SET @has_recording_path = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'livestreams' AND column_name = 'recording_path'
);
SET @recording_path_sql = IF(@has_recording_path = 0,
  'ALTER TABLE livestreams ADD COLUMN recording_path VARCHAR(512) NULL AFTER recording_egress_id', 'SELECT 1');
PREPARE recording_path_stmt FROM @recording_path_sql;
EXECUTE recording_path_stmt;
DEALLOCATE PREPARE recording_path_stmt;

SET @has_recording_status = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'livestreams' AND column_name = 'recording_status'
);
SET @recording_status_sql = IF(@has_recording_status = 0,
  'ALTER TABLE livestreams ADD COLUMN recording_status ENUM(''recording'', ''ready'', ''failed'', ''unavailable'') NOT NULL DEFAULT ''unavailable'' AFTER recording_path', 'SELECT 1');
PREPARE recording_status_stmt FROM @recording_status_sql;
EXECUTE recording_status_stmt;
DEALLOCATE PREPARE recording_status_stmt;
