/**
 * Migration: Create gem transactions table for tracking gem economy
 */

exports.up = function(knex) {
  return knex.schema.createTable('gem_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    table.integer('amount').notNullable(); // Positive for earned, negative for spent
    table.string('source', 50).notNullable(); // 'battle', 'store_purchase', 'store_spend', etc.
    table.uuid('reference_id'); // Battle result ID or store transaction ID
    table.integer('balance_after').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['player_id', 'created_at']);
    table.index('source');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('gem_transactions');
};
