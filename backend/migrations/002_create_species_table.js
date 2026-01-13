/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('species', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description');
    table.enum('rarity_tier', ['common', 'uncommon', 'rare', 'epic', 'legendary']).notNullable();
    table.jsonb('base_stats').notNullable();
    table.jsonb('abilities').notNullable().defaultTo('[]');
    table.jsonb('evolution_sprites').notNullable().defaultTo('[]');
    table.integer('discovery_count').notNullable().defaultTo(0);
    table.integer('max_fusion_level').notNullable().defaultTo(2);
    table.uuid('created_by').nullable().references('id').inTable('players');
    table.timestamps(true, true);

    // Indexes
    table.index('rarity_tier');
    table.index('discovery_count');
    table.index('created_by');
    table.index(['rarity_tier', 'discovery_count']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('species');
};