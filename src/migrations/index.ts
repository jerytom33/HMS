import * as migration_20261003_091611_property_types_and_names from './20261003_091611_property_types_and_names';

export const migrations = [
  {
    up: migration_20261003_091611_property_types_and_names.up,
    down: migration_20261003_091611_property_types_and_names.down,
    name: '20261003_091611_property_types_and_names'
  },
];
