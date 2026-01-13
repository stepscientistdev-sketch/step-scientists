/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('steplings', function(table) {
    table.boolean('has_suboptimal_fusion').defaultTo(false).comment('True if this stepling or any of its fusion ancestors were fused below max level');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('steplings', function(table) {
    table.dropColumn('has_suboptimal_fusion');
  });
};