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
        hp: 100,
        attack: 50,
        defense: 40,
        speed: 30,
        regen: 2,      // 2% HP regen per turn
        lifesteal: 1   // 1% of damage as healing
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
        hp: 150,
        attack: 30,
        defense: 80,
        speed: 20,
        regen: 3,      // Tank with high regen
        lifesteal: 0.5 // Low lifesteal (defensive, not offensive)
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
        hp: 1500,      // 15x common (uncommon tier)
        attack: 750,
        defense: 600,
        speed: 450,
        regen: 1.5,    // Lower regen (glass cannon)
        lifesteal: 2.5 // High lifesteal (offensive sustain)
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
        hp: 1350,      // 15x common (uncommon tier)
        attack: 450,
        defense: 1200,
        speed: 300,
        regen: 2,      // Balanced regen
        lifesteal: 1.5 // Moderate lifesteal
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
        hp: 15000,     // 50x common (rare tier)
        attack: 10000,
        defense: 7500,
        speed: 12500,
        regen: 3,      // High regen (legendary sustain)
        lifesteal: 3   // High lifesteal (legendary power)
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