CREATE TABLE IF NOT EXISTS content_likes (
  content_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id),
  INDEX idx_content_likes_user (user_id),
  CONSTRAINT fk_content_likes_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_likes (
  asset_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, user_id),
  INDEX idx_asset_likes_user (user_id),
  CONSTRAINT fk_asset_likes_asset FOREIGN KEY (asset_id) REFERENCES content_assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stream_likes (
  stream_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stream_id, user_id),
  INDEX idx_stream_likes_user (user_id),
  CONSTRAINT fk_stream_likes_stream FOREIGN KEY (stream_id) REFERENCES livestreams(id) ON DELETE CASCADE,
  CONSTRAINT fk_stream_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
