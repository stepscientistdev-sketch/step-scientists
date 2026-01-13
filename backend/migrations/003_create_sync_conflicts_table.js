/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('sync_conflicts', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    table.string('field').notNullable(); // 'stepCount', 'resources', etc.
    table.text('local_value').notNullable(); // JSON string
    table.text('server_value').notNullable(); // JSON string
    table.timestamp('last_sync_timestamp').notNullable();
    table.timestamp('conflict_timestamp').notNullable();
    table.enum('status', ['pending', 'resolved', 'rejected']).defaultTo('pending');
    table.enum('resolution_strategy', ['server_wins', 'client_wins', 'merge_values', 'manual_review']).nullable();
    table.text('resolved_value').nullable(); // JSON string
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['player_id', 'status']);
    table.index(['player_id', 'field']);
    table.index('conflict_timestamp');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('sync_conflicts');
};