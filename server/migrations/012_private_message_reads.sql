CREATE TABLE IF NOT EXISTS private_message_reads (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id CHAR(36) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  INDEX idx_private_message_reads_user (user_id),
  CONSTRAINT fk_private_message_read_message FOREIGN KEY (message_id) REFERENCES private_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_message_read_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
