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
          regen: 5,
          lifesteal: 3
        };
        break;
      case 'Pebble Turtle':
        newStats = {
          hp: 150,
          attack: 30,
          defense: 80,
          speed: 20,
          regen: 8,
          lifesteal: 2
        };
        break;
      case 'Flame Salamander':
        newStats = {
          hp: 200,
          attack: 120,
          defense: 70,
          speed: 90,
          regen: 6,
          lifesteal: 8
        };
        break;
      case 'Crystal Beetle':
        newStats = {
          hp: 180,
          attack: 90,
          defense: 130,
          speed: 60,
          regen: 7,
          lifesteal: 5
        };
        break;
      case 'Storm Eagle':
        newStats = {
          hp: 300,
          attack: 200,
          defense: 150,
          speed: 250,
          regen: 10,
          lifesteal: 12
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
