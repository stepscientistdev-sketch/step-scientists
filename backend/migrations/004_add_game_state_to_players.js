/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('players', function(table) {
    // Add comprehensive game state storage
    table.jsonb('game_state').nullable().comment('Full game state for backup/restore');
    table.timestamp('game_state_updated_at').nullable().comment('Last time game state was synced');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('players', function(table) {
    table.dropColumn('game_state');
    table.dropColumn('game_state_updated_at');
  });
};
