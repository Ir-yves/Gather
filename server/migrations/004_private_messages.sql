CREATE TABLE IF NOT EXISTS private_conversations (
  id CHAR(36) PRIMARY KEY,
  participant_a CHAR(36) NOT NULL,
  participant_b CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_private_conversation_pair (participant_a, participant_b),
  INDEX idx_private_conversations_b (participant_b),
  CONSTRAINT fk_private_conversation_a FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_conversation_b FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  forwarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_private_messages_conversation (conversation_id, id),
  CONSTRAINT fk_private_message_conversation FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
