import * as migration_20261003_091611_property_types_and_names from './20261003_091611_property_types_and_names';
import * as migration_20261003_094457_unit_types from './20261003_094457_unit_types';
import * as migration_20261003_105154_browser_image_urls from './20261003_105154_browser_image_urls';

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
    name: '20261003_105154_browser_image_urls'
  },
];
