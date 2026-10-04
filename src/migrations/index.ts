import * as migration_20261003_091611_property_types_and_names from './20261003_091611_property_types_and_names';
import * as migration_20261003_094457_unit_types from './20261003_094457_unit_types';
import * as migration_20261003_105154_browser_image_urls from './20261003_105154_browser_image_urls';
import * as migration_20261003_132908_amounts_in_pln from './20261003_132908_amounts_in_pln';
import * as migration_20261003_164146_bot_bookings_indexes from './20261003_164146_bot_bookings_indexes';
import * as migration_20261004_072345_student_whatsapp_index from './20261004_072345_student_whatsapp_index';
import * as migration_20261004_150000_drop_student_password from './20261004_150000_drop_student_password';
import * as migration_20261004_170000_student_passwords from './20261004_170000_student_passwords';

export const migrations = [
  {
    up: migration_20261003_091611_property_types_and_names.up,
    down: migration_20261003_091611_property_types_and_names.down,
    name: '20261003_091611_property_types_and_names',
  },
  {
    up: migration_20261003_094457_unit_types.up,
    down: migration_20261003_094457_unit_types.down,
    name: '20261003_094457_unit_types',
  },
  {
    up: migration_20261003_105154_browser_image_urls.up,
    down: migration_20261003_105154_browser_image_urls.down,
    name: '20261003_105154_browser_image_urls',
  },
  {
    up: migration_20261003_132908_amounts_in_pln.up,
    down: migration_20261003_132908_amounts_in_pln.down,
    name: '20261003_132908_amounts_in_pln',
  },
  {
    up: migration_20261003_164146_bot_bookings_indexes.up,
    down: migration_20261003_164146_bot_bookings_indexes.down,
    name: '20261003_164146_bot_bookings_indexes',
  },
  {
    up: migration_20261004_072345_student_whatsapp_index.up,
    down: migration_20261004_072345_student_whatsapp_index.down,
    name: '20261004_072345_student_whatsapp_index'
  },
  {
    up: migration_20261004_150000_drop_student_password.up,
    down: migration_20261004_150000_drop_student_password.down,
    name: '20261004_150000_drop_student_password',
  },
  {
    up: migration_20261004_170000_student_passwords.up,
    down: migration_20261004_170000_student_passwords.down,
    name: '20261004_170000_student_passwords',
  },
];
