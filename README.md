# Step Monsters

A mobile MMO monster collection game where players use real-world step counts to discover and train monsters.

## Features

- **Step Tracking**: Uses device pedometer to track real-world walking
- **Game Modes**: Switch between Discovery Mode (earn cells) and Training Mode (earn XP)
- **Monster Collection**: Discover unique monster species with rarity tiers
- **Fusion System**: Combine monsters to create stronger versions
- **Boss Battles**: Test your team against challenging encounters
- **Community Features**: Guilds, tournaments, and trading (coming soon)

## Tech Stack

### Mobile App
- React Native with TypeScript
- Redux Toolkit for state management
- React Navigation for routing
- AsyncStorage for local persistence

### Backend
- Node.js with Express.js
- PostgreSQL database
- JWT authentication
- Knex.js for database operations

## Development Setup

### Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **React Native development environment**:
   - Android Studio (for Android development)
   - Xcode (for iOS development, macOS only)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd step-monsters
   ```

2. **Run setup script**
   ```bash
   chmod +x setup-dev.sh
   ./setup-dev.sh
   ```

3. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start the mobile app** (in a new terminal)
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   ```bash
   # Android
   npm run android
   
   # iOS (macOS only)
   npm run ios
   ```

### Manual Setup

If the setup script doesn't work, follow these manual steps:

#### Database Setup

1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE step_monsters;
   ```

2. Update `backend/.env` with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=step_monsters
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npx knex migrate:latest
npx knex seed:run
npm run build
npm run dev
```

#### Mobile App Setup

```bash
npm install
npm start
```

## Project Structure

```
step-monsters/
├── src/                    # Mobile app source
│   ├── components/         # React components
│   ├── services/          # API and device services
│   ├── store/             # Redux store and slices
│   └── types/             # TypeScript type definitions
├── backend/               # Backend API
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── types/         # TypeScript types
│   ├── migrations/        # Database migrations
│   └── seeds/             # Database seed data
└── .kiro/specs/          # Feature specifications
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Login player
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout player

### Game (Coming Soon)
- `POST /api/game/sync-steps` - Sync step count data
- `POST /api/game/switch-mode` - Switch between Discovery/Training modes
- `POST /api/game/inspect-cell` - Discover new monsters
- `GET /api/game/species` - Get available species

### Players (Coming Soon)
- `GET /api/players/profile` - Get player profile
- `PUT /api/players/profile` - Update player profile
- `GET /api/players/steplings` - Get player's monster collection

## Development Guidelines

### Mobile App
- Use TypeScript for all new code
- Follow React Native best practices
- Use Redux Toolkit for state management
- Implement proper error handling for device APIs

### Backend
- Use TypeScript for all new code
- Follow RESTful API conventions
- Implement proper validation with Joi
- Use database transactions for data consistency
- Add comprehensive error handling

### Database
- Use Knex migrations for schema changes
- Follow PostgreSQL naming conventions
- Add proper indexes for performance
- Use JSONB for flexible data structures

## Testing

```bash
# Backend tests
cd backend
npm test

# Mobile app tests
npm test
```

## Deployment

### Backend
1. Set production environment variables
2. Run database migrations
3. Build and deploy to your hosting platform

### Mobile App
1. Build for production
2. Submit to app stores (Google Play, Apple App Store)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open a GitHub issue or contact the development team.