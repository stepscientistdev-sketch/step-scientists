/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Check if species already exist
  const existingSpecies = await knex('species').count('* as count').first();
  
  if (parseInt(existingSpecies.count) > 0) {
    console.log('Species already exist, skipping seed');
    return;
  }

  // Insert initial species data only if none exist
  await knex('species').insert([
    // Common tier species (2-3 species)
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Grasshopper',
      description: 'A small, agile creature that loves to hop around meadows.',
      rarity_tier: 'common',
      base_stats: JSON.stringify({
        health: 20,
        attack: 15,
        defense: 10,
        special: 5
      }),
      abilities: JSON.stringify([
        {
          id: 'hop',
          name: 'Hop',
          description: 'Quick movement that increases evasion',
          effect: 'evasion_boost'
        }
      ]),
      evolution_sprites: JSON.stringify([
        'grasshopper_1.png',
        'grasshopper_2.png',
        'grasshopper_3.png'
      ]),
      discovery_count: 0,
      max_fusion_level: 2
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Pebble Turtle',
      description: 'A sturdy turtle with a shell made of smooth pebbles.',
      rarity_tier: 'common',
      base_stats: JSON.stringify({
        health: 30,
        attack: 8,
        defense: 20,
        special: 2
      }),
      abilities: JSON.stringify([
        {
          id: 'shell_defense',
          name: 'Shell Defense',
          description: 'Reduces incoming damage',
          effect: 'damage_reduction'
        }
      ]),
      evolution_sprites: JSON.stringify([
        'pebble_turtle_1.png',
        'pebble_turtle_2.png',
        'pebble_turtle_3.png'
      ]),
      discovery_count: 0,
      max_fusion_level: 2
    },

    // Uncommon tier species (2-3 species)
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Flame Salamander',
      description: 'A fiery salamander that can generate small flames.',
      rarity_tier: 'uncommon',
      base_stats: JSON.stringify({
        health: 45,
        attack: 35,
        defense: 20,
        special: 25
      }),
      abilities: JSON.stringify([
        {
          id: 'flame_burst',
          name: 'Flame Burst',
          description: 'Deals fire damage to enemies',
          effect: 'fire_damage'
        },
        {
          id: 'heat_resistance',
          name: 'Heat Resistance',
          description: 'Immune to fire-based attacks',
          effect: 'fire_immunity'
        }
      ]),
      evolution_sprites: JSON.stringify([
        'flame_salamander_1.png',
        'flame_salamander_2.png',
        'flame_salamander_3.png'
      ]),
      discovery_count: 0,
      max_fusion_level: 4
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Crystal Beetle',
      description: 'A beautiful beetle with crystalline wings that refract light.',
      rarity_tier: 'uncommon',
      base_stats: JSON.stringify({
        health: 40,
        attack: 25,
        defense: 35,
        special: 30
      }),
      abilities: JSON.stringify([
        {
          id: 'light_refraction',
          name: 'Light Refraction',
          description: 'Confuses enemies with dazzling light',
          effect: 'confusion'
        },
        {
          id: 'crystal_armor',
          name: 'Crystal Armor',
          description: 'Increases defense against physical attacks',
          effect: 'physical_resistance'
        }
      ]),
      evolution_sprites: JSON.stringify([
        'crystal_beetle_1.png',
        'crystal_beetle_2.png',
        'crystal_beetle_3.png'
      ]),
      discovery_count: 0,
      max_fusion_level: 4
    },

    // Rare tier species (2 species)
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Storm Eagle',
      description: 'A majestic eagle that commands the power of storms.',
      rarity_tier: 'rare',
      base_stats: JSON.stringify({
        health: 80,
        attack: 70,
        defense: 45,
        special: 85
      }),
      abilities: JSON.stringify([
        {
          id: 'lightning_strike',
          name: 'Lightning Strike',
          description: 'Powerful electric attack',
          effect: 'electric_damage'
        },
        {
          id: 'wind_mastery',
          name: 'Wind Mastery',
          description: 'Controls wind currents for enhanced speed',
          effect: 'speed_boost'
        },
        {
          id: 'storm_call',
          name: 'Storm Call',
          description: 'Summons a storm that affects the battlefield',
          effect: 'weather_control'
        }
      ]),
      evolution_sprites: JSON.stringify([
        'storm_eagle_1.png',
        'storm_eagle_2.png',
        'storm_eagle_3.png',
        'storm_eagle_4.png'
      ]),
      discovery_count: 0,
      max_fusion_level: 6
    }
  ]);
};