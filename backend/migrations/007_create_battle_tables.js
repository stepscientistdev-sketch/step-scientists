/**
 * Migration: Create battle system tables
 * - battle_results: Store individual battle outcomes
 * - leaderboards: Track top scores per tier and period
 * - player_boss_progress: Track player's max tier unlocked and best scores
 */

exports.up = function(knex) {
  return Promise.all([
    // Battle results table
    knex.schema.createTable('battle_results', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.integer('boss_tier').notNullable();
      table.boolean('victory').notNullable();
      table.integer('turns_survived').notNullable();
      table.bigInteger('total_damage').notNullable();
      table.bigInteger('score').notNullable();
      table.integer('gems_earned').notNullable();
      table.jsonb('team_snapshot').notNullable(); // Array of stepling data
      table.jsonb('battle_log').notNullable(); // Array of battle events
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('player_id');
      table.index(['boss_tier', 'score']);
      table.index('created_at');
      
      // Constraints
      table.check('boss_tier >= 1 AND boss_tier <= 5', [], 'boss_tier_range');
    }),
    
    // Leaderboards table
    knex.schema.createTable('leaderboards', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.string('player_name', 100).notNullable();
      table.integer('boss_tier').notNullable();
      table.bigInteger('score').notNullable();
      table.integer('turns_survived').notNullable();
      table.jsonb('team_snapshot').notNullable();
      table.string('leaderboard_type', 20).notNullable(); // 'global', 'daily', 'weekly'
      table.date('period_start').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['boss_tier', 'leaderboard_type', 'score']);
      table.index('period_start');
      
      // Unique constraint: one entry per player per tier per type per period
      table.unique(['player_id', 'boss_tier', 'leaderboard_type', 'period_start']);
      
      // Constraints
      table.check('boss_tier >= 1 AND boss_tier <= 5', [], 'boss_tier_range');
      table.check("leaderboard_type IN ('global', 'daily', 'weekly')", [], 'leaderboard_type_valid');
    }),
    
    // Player boss progress table
    knex.schema.createTable('player_boss_progress', (table) => {
      table.uuid('player_id').primary().references('id').inTable('players').onDelete('CASCADE');
      table.integer('max_tier_unlocked').defaultTo(1).notNullable();
      table.jsonb('best_scores').defaultTo('{}').notNullable(); // Map of tier -> best score
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Constraints
      table.check('max_tier_unlocked >= 1 AND max_tier_unlocked <= 5', [], 'max_tier_range');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('player_boss_progress'),
    knex.schema.dropTableIfExists('leaderboards'),
    knex.schema.dropTableIfExists('battle_results')
  ]);
};
