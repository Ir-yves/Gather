CREATE TABLE IF NOT EXISTS content_views (
  content_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id),
  INDEX idx_content_views_user (user_id),
  CONSTRAINT fk_content_views_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_views (
  asset_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, user_id),
  INDEX idx_asset_views_user (user_id),
  CONSTRAINT fk_asset_views_asset FOREIGN KEY (asset_id) REFERENCES content_assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stream_views (
  stream_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stream_id, user_id),
  INDEX idx_stream_views_user (user_id),
  CONSTRAINT fk_stream_views_stream FOREIGN KEY (stream_id) REFERENCES livestreams(id) ON DELETE CASCADE,
  CONSTRAINT fk_stream_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
