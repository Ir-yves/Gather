SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'conversation_type') = 0,
  'ALTER TABLE private_conversations ADD COLUMN conversation_type VARCHAR(16) NOT NULL DEFAULT ''direct'' AFTER participant_b',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'name') = 0,
  'ALTER TABLE private_conversations ADD COLUMN name VARCHAR(100) NULL AFTER conversation_type',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT IS_NULLABLE FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'participant_a') = 'NO',
  'ALTER TABLE private_conversations MODIFY participant_a CHAR(36) NULL',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT IS_NULLABLE FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'participant_b') = 'NO',
  'ALTER TABLE private_conversations MODIFY participant_b CHAR(36) NULL',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

CREATE TABLE IF NOT EXISTS private_conversation_members (
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  INDEX idx_private_conversation_members_user (user_id),
  CONSTRAINT fk_private_conversation_member_conversation FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_conversation_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_messages' AND column_name = 'reply_to_message_id') = 0,
  'ALTER TABLE private_messages ADD COLUMN reply_to_message_id BIGINT UNSIGNED NULL AFTER forwarded',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'private_messages' AND index_name = 'idx_private_messages_reply') = 0,
  'ALTER TABLE private_messages ADD INDEX idx_private_messages_reply (reply_to_message_id)',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.key_column_usage
   WHERE table_schema = DATABASE() AND table_name = 'private_messages' AND constraint_name = 'fk_private_message_reply') = 0,
  'ALTER TABLE private_messages ADD CONSTRAINT fk_private_message_reply FOREIGN KEY (reply_to_message_id) REFERENCES private_messages(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;
