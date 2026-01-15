/**
 * Migration to update stats structure from old format to new format
 * Old: { health, attack, defense, special }
 * New: { hp, attack, defense, speed, regen, lifesteal }
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Update species base_stats
  const species = await knex('species').select('*');
  
  for (const s of species) {
    const oldStats = typeof s.base_stats === 'string' ? JSON.parse(s.base_stats) : s.base_stats;
    
    // Map old stats to new stats based on species name
    let newStats;
    
    switch(s.name) {
      case 'Grasshopper':
        newStats = {
          hp: 100,
          attack: 50,
          defense: 40,
          speed: 30,
          regen: 2,
          lifesteal: 1
        };
        break;
      case 'Pebble Turtle':
        newStats = {
          hp: 150,
          attack: 30,
          defense: 80,
          speed: 20,
          regen: 3,
          lifesteal: 0.5
        };
        break;
      case 'Flame Salamander':
        newStats = {
          hp: 1500,
          attack: 750,
          defense: 600,
          speed: 450,
          regen: 1.5,
          lifesteal: 2.5
        };
        break;
      case 'Crystal Beetle':
        newStats = {
          hp: 1350,
          attack: 450,
          defense: 1200,
          speed: 300,
          regen: 2,
          lifesteal: 1.5
        };
        break;
      case 'Storm Eagle':
        newStats = {
          hp: 15000,
          attack: 10000,
          defense: 7500,
          speed: 12500,
          regen: 3,
          lifesteal: 3
        };
        break;
      default:
        // For any unknown species, convert proportionally
        newStats = {
          hp: oldStats.health * 5 || 100,
          attack: oldStats.attack * 2 || 50,
          defense: oldStats.defense * 2 || 40,
          speed: oldStats.special * 2 || 30,
          regen: 5,
          lifesteal: 3
        };
    }
    
    await knex('species')
      .where('id', s.id)
      .update({
        base_stats: JSON.stringify(newStats)
      });
  }
  
  console.log(`Updated ${species.length} species with new stat structure`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Rollback: convert new stats back to old format
  const species = await knex('species').select('*');
  
  for (const s of species) {
    const newStats = typeof s.base_stats === 'string' ? JSON.parse(s.base_stats) : s.base_stats;
    
    const oldStats = {
      health: Math.round(newStats.hp / 5),
      attack: Math.round(newStats.attack / 2),
      defense: Math.round(newStats.defense / 2),
      special: Math.round(newStats.speed / 2)
    };
    
    await knex('species')
      .where('id', s.id)
      .update({
        base_stats: JSON.stringify(oldStats)
      });
  }
  
  console.log(`Rolled back ${species.length} species to old stat structure`);
};
