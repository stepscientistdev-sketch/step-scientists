exports.up = function(knex) {
  return knex.schema.createTable('lifetime_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable();
    table.integer('bonus_cells_per_day').defaultTo(0);
    table.integer('discovery_efficiency').defaultTo(0); // percentage
    table.integer('training_efficiency').defaultTo(0); // percentage
    table.integer('click_power').defaultTo(1);
    table.integer('experience_bank_cap').defaultTo(100);
    table.integer('training_roster_slots').defaultTo(10);
    table.integer('release_xp_bonus').defaultTo(0); // percentage
    table.json('unlocked_achievements').defaultTo('[]');
    table.timestamp('last_daily_bonus_claim').nullable();
    table.timestamps(true, true);

    table.foreign('player_id').references('players.id').onDelete('CASCADE');
    table.unique('player_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('lifetime_achievements');
};
