/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('steplings', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    table.uuid('species_id').notNullable().references('id').inTable('species');
    table.integer('level').notNullable().defaultTo(1);
    table.integer('fusion_level').notNullable().defaultTo(1);
    table.jsonb('current_stats').notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index('player_id');
    table.index('species_id');
    table.index(['player_id', 'species_id']);
    table.index(['player_id', 'level']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('steplings');
};