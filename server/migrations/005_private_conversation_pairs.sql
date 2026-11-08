SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'participant_a') = 0,
  'ALTER TABLE private_conversations ADD COLUMN participant_a CHAR(36) NULL AFTER id',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'participant_b') = 0,
  'ALTER TABLE private_conversations ADD COLUMN participant_b CHAR(36) NULL AFTER participant_a',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_messages' AND column_name = 'forwarded') = 0,
  'ALTER TABLE private_messages ADD COLUMN forwarded BOOLEAN NOT NULL DEFAULT FALSE AFTER message',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND index_name = 'uq_private_conversation_pair') = 0,
  'ALTER TABLE private_conversations ADD UNIQUE KEY uq_private_conversation_pair (participant_a, participant_b)',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND index_name = 'idx_private_conversations_b') = 0,
  'ALTER TABLE private_conversations ADD INDEX idx_private_conversations_b (participant_b)',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.key_column_usage
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND constraint_name = 'fk_private_conversation_a') = 0,
  'ALTER TABLE private_conversations ADD CONSTRAINT fk_private_conversation_a FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.key_column_usage
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND constraint_name = 'fk_private_conversation_b') = 0,
  'ALTER TABLE private_conversations ADD CONSTRAINT fk_private_conversation_b FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;

SET @private_chat_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'member_id') > 0
  AND
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'private_conversations' AND column_name = 'conversation_type') > 0,
  'UPDATE private_conversations c
   JOIN (
     SELECT m.conversation_id, MIN(m.sender_id) AS other_id
     FROM private_messages m
     JOIN private_conversations legacy ON legacy.id = m.conversation_id
     WHERE legacy.conversation_type = ''direct''
       AND legacy.member_id IS NOT NULL
       AND m.sender_id <> legacy.member_id
     GROUP BY m.conversation_id
     HAVING COUNT(DISTINCT m.sender_id) = 1
   ) participants ON participants.conversation_id = c.id
   SET c.participant_a = LEAST(c.member_id, participants.other_id),
       c.participant_b = GREATEST(c.member_id, participants.other_id)
   WHERE c.participant_a IS NULL AND c.participant_b IS NULL',
  'SELECT 1'
);
PREPARE private_chat_stmt FROM @private_chat_sql;
EXECUTE private_chat_stmt;
DEALLOCATE PREPARE private_chat_stmt;
