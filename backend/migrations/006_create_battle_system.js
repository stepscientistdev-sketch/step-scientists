exports.up = async function(knex) {
  // Check if columns already exist
  const hasGems = await knex.schema.hasColumn('players', 'gems');
  const hasEnergy = await knex.schema.hasColumn('players', 'energy_current');
  
  // Add energy and gems to players table if they don't exist
  if (!hasGems || !hasEnergy) {
    await knex.schema.table('players', function(table) {
      if (!hasGems) {
        table.integer('gems').defaultTo(0).notNullable();
      }
      if (!hasEnergy) {
        table.integer('energy_current').defaultTo(10).notNullable();
        table.integer('energy_max').defaultTo(10).notNullable();
        table.timestamp('energy_last_regen_time').defaultTo(knex.fn.now());
        table.integer('energy_last_step_count').defaultTo(0).notNullable();
      }
    });
  }
  
  return knex.schema
  return knex.schema
    // Battle results table
    .createTableIfNotExists('battle_results', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.integer('boss_tier').notNullable();
      table.boolean('victory').notNullable();
      table.integer('turns_survived').notNullable();
      table.bigInteger('total_damage').notNullable();
      table.bigInteger('score').notNullable();
      table.integer('gems_earned').notNullable();
      table.jsonb('team_snapshot').notNullable();
      table.jsonb('battle_log').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.check('?? >= 1 AND ?? <= 5', ['boss_tier', 'boss_tier']);
      
      table.index(['player_id']);
      table.index(['boss_tier', 'score']);
      table.index(['created_at']);
    })
    // Leaderboards table
    .createTableIfNotExists('leaderboards', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.string('player_name', 100).notNullable();
      table.integer('boss_tier').notNullable();
      table.bigInteger('score').notNullable();
      table.integer('turns_survived').notNullable();
      table.jsonb('team_snapshot').notNullable();
      table.string('leaderboard_type', 20).notNullable();
      table.date('period_start').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.check('?? >= 1 AND ?? <= 5', ['boss_tier', 'boss_tier']);
      table.check('?? IN (?, ?, ?)', ['leaderboard_type', 'global', 'daily', 'weekly']);
      
      table.unique(['player_id', 'boss_tier', 'leaderboard_type', 'period_start']);
      table.index(['boss_tier', 'leaderboard_type', 'score']);
      table.index(['period_start']);
    })
    // Player boss progress table
    .createTableIfNotExists('player_boss_progress', function(table) {
      table.uuid('player_id').primary().references('id').inTable('players').onDelete('CASCADE');
      table.integer('max_tier_unlocked').defaultTo(1).notNullable();
      table.jsonb('best_scores').defaultTo('{}').notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.check('?? >= 1 AND ?? <= 5', ['max_tier_unlocked', 'max_tier_unlocked']);
    })
    // Gem transactions table
    .createTableIfNotExists('gem_transactions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      table.integer('amount').notNullable();
      table.string('source', 50).notNullable();
      table.uuid('reference_id');
      table.integer('balance_after').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['player_id', 'created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('gem_transactions')
    .dropTableIfExists('player_boss_progress')
    .dropTableIfExists('leaderboards')
    .dropTableIfExists('battle_results')
    .table('players', function(table) {
      table.dropColumn('gems');
      table.dropColumn('energy_current');
      table.dropColumn('energy_max');
      table.dropColumn('energy_last_regen_time');
      table.dropColumn('energy_last_step_count');
    });
};
