CREATE DATABASE IF NOT EXISTS streamline
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE streamline;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  notify_private_messages BOOLEAN NOT NULL DEFAULT TRUE,
  notify_content BOOLEAN NOT NULL DEFAULT TRUE,
  notify_livestreams BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
  ('site_name', 'gather.'),
  ('welcome_message', 'Your people, your ideas, your moment. Everything in one place.');

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  category ENUM('private_messages', 'content', 'livestreams') NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500) NOT NULL,
  href VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  INDEX idx_notifications_user_created (user_id, created_at),
  INDEX idx_notifications_user_read (user_id, read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(2048) NULL,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_content_author FOREIGN KEY (created_by) REFERENCES users(id)
);

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

CREATE TABLE IF NOT EXISTS content_likes (
  content_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id),
  INDEX idx_content_likes_user (user_id),
  CONSTRAINT fk_content_likes_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_views (
  content_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id),
  INDEX idx_content_views_user (user_id),
  CONSTRAINT fk_content_views_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS asset_views (
  asset_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, user_id),
  INDEX idx_asset_views_user (user_id),
  CONSTRAINT fk_asset_views_asset FOREIGN KEY (asset_id) REFERENCES content_assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_created_at (created_at),
  CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS private_conversations (
  id CHAR(36) PRIMARY KEY,
  participant_a CHAR(36) NULL,
  participant_b CHAR(36) NULL,
  conversation_type VARCHAR(16) NOT NULL DEFAULT 'direct',
  name VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_private_conversation_pair (participant_a, participant_b),
  INDEX idx_private_conversations_b (participant_b),
  CONSTRAINT fk_private_conversation_a FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_conversation_b FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_conversation_members (
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  INDEX idx_private_conversation_members_user (user_id),
  CONSTRAINT fk_private_conversation_member_conversation FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_conversation_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  forwarded BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to_message_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_private_messages_conversation (conversation_id, id),
  INDEX idx_private_messages_reply (reply_to_message_id),
  CONSTRAINT fk_private_message_conversation FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_message_reply FOREIGN KEY (reply_to_message_id) REFERENCES private_messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS livestreams (
  id CHAR(36) PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  created_by CHAR(36) NOT NULL,
  CONSTRAINT fk_stream_author FOREIGN KEY (created_by) REFERENCES users(id)
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

CREATE TABLE IF NOT EXISTS stream_views (
  stream_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stream_id, user_id),
  INDEX idx_stream_views_user (user_id),
  CONSTRAINT fk_stream_views_stream FOREIGN KEY (stream_id) REFERENCES livestreams(id) ON DELETE CASCADE,
  CONSTRAINT fk_stream_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
