-- Smart Farm Sensor Logs Schema (MySQL / MariaDB)

CREATE DATABASE IF NOT EXISTS `smart_farm_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_farm_db`;

CREATE TABLE IF NOT EXISTS `farm_sensor_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `rpi_doc_id` VARCHAR(64) DEFAULT NULL,
  `node_id` VARCHAR(64) NOT NULL,
  `node_ts` BIGINT DEFAULT NULL,
  `s_temp` DECIMAL(6,2) DEFAULT NULL COMMENT 'soil_temp',
  `s_hmd` DECIMAL(6,2) DEFAULT NULL COMMENT 'soil_humidity',
  `w_temp` DECIMAL(6,2) DEFAULT NULL COMMENT 'water_temp',
  `a_hmd` DECIMAL(6,2) DEFAULT NULL COMMENT 'air_humidity',
  `p_water` DECIMAL(6,2) DEFAULT NULL COMMENT 'water_ph',
  `e_water` DECIMAL(6,2) DEFAULT NULL COMMENT 'water_ec',
  `l_int` DECIMAL(10,2) DEFAULT NULL COMMENT 'light_intensity',
  `s_temp_s` DECIMAL(6,2) DEFAULT NULL COMMENT 'air_temp',
  `w_speed` DECIMAL(6,2) DEFAULT NULL COMMENT 'wind_speed',
  `w_level` DECIMAL(6,2) DEFAULT NULL COMMENT 'water_level',
  `f_rate` DECIMAL(6,2) DEFAULT NULL COMMENT 'flow_rate',
  `c_stat` VARCHAR(32) DEFAULT NULL COMMENT 'current_status',
  `f_stat` VARCHAR(32) DEFAULT NULL COMMENT 'feedback_status',
  `rssi` INT DEFAULT NULL,
  `snr` DECIMAL(5,2) DEFAULT NULL,
  `rpi_received_at` VARCHAR(64) DEFAULT NULL,
  `synced_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_node_time` (`node_id`, `synced_at`),
  INDEX `idx_rpi_doc` (`rpi_doc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
