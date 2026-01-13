/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('players', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 50).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.jsonb('step_data').notNullable().defaultTo(JSON.stringify({
      total_steps: 0,
      daily_steps: 0,
      last_updated: new Date().toISOString()
    }));
    table.jsonb('resources').notNullable().defaultTo(JSON.stringify({
      cells: 0,
      experience_points: 0
    }));
    table.enum('current_mode', ['discovery', 'training']).notNullable().defaultTo('discovery');
    table.uuid('guild_id').nullable();
    table.timestamp('last_sync').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('username');
    table.index('email');
    table.index('guild_id');
    table.index('last_sync');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('players');
};