CREATE TABLE IF NOT EXISTS content_assets (
  id CHAR(36) PRIMARY KEY,
  content_id CHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(127) NOT NULL,
  category ENUM('document', 'video') NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_content_assets_content (content_id),
  CONSTRAINT fk_content_assets_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);
