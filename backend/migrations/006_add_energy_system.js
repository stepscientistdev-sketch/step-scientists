/**
 * Migration: Add energy system to players table
 * - energy_current: Current energy (0-10)
 * - energy_max: Maximum energy capacity (default 10)
 * - energy_last_regen_time: Last passive regeneration timestamp
 * - energy_last_step_count: Last step count for active regen tracking
 * - gems: Gem currency for rewards
 */

exports.up = function(knex) {
  return knex.schema.table('players', (table) => {
    // Energy system columns
    table.integer('energy_current').defaultTo(10).notNullable();
    table.integer('energy_max').defaultTo(10).notNullable();
    table.timestamp('energy_last_regen_time').defaultTo(knex.fn.now()).notNullable();
    table.integer('energy_last_step_count').defaultTo(0).notNullable();
    
    // Gem currency
    table.integer('gems').defaultTo(0).notNullable();
    
    // Add constraints
    table.check('energy_current >= 0 AND energy_current <= energy_max', [], 'energy_current_range');
    table.check('energy_max > 0', [], 'energy_max_positive');
    table.check('gems >= 0', [], 'gems_non_negative');
  });
};

exports.down = function(knex) {
  return knex.schema.table('players', (table) => {
    table.dropColumn('energy_current');
    table.dropColumn('energy_max');
    table.dropColumn('energy_last_regen_time');
    table.dropColumn('energy_last_step_count');
    table.dropColumn('gems');
  });
};
