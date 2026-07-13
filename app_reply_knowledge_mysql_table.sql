CREATE TABLE IF NOT EXISTS `fnd_app_reply_knowledge_tab` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `app_id` INT UNSIGNED DEFAULT NULL,
  `app_name` VARCHAR(150) NOT NULL,
  `platform` ENUM('Android','iOS','All') NOT NULL DEFAULT 'All',
  `app_context` TEXT NOT NULL,
  `common_rules` TEXT DEFAULT NULL,
  `known_limitations` TEXT DEFAULT NULL,
  `reply_tone` VARCHAR(80) NOT NULL DEFAULT 'professional, friendly, concise',
  `max_reply_chars` INT UNSIGNED NOT NULL DEFAULT 450,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_app_reply_knowledge` (`app_name`, `platform`),
  KEY `idx_app_reply_knowledge_app_id` (`app_id`),
  KEY `idx_app_reply_knowledge_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example:
-- INSERT INTO `fnd_app_reply_knowledge_tab`
--   (`app_name`, `platform`, `app_context`, `common_rules`, `known_limitations`, `reply_tone`, `max_reply_chars`, `status`)
-- VALUES
--   (
--     'Concise Physiology',
--     'Android',
--     'Concise medical physiology notes app for quick study and revision.',
--     'If users ask for missing content, thank them and explain that suggestions are reviewed. Do not promise timelines.',
--     'This app currently focuses on concise notes. Review questions may not be available for all topics.',
--     'professional, friendly, concise',
--     450,
--     'ACTIVE'
--   );
