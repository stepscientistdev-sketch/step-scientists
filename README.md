# Step Scientists

A web and mobile game where players use real-world step counts to discover and train creatures called "Steplings".

## Project Architecture

### Web App (Production - DEPLOYED)
- **Location**: `public/` folder
- **Technology**: Vanilla JavaScript, HTML, CSS
- **Deployment**: Vercel
- **URL**: https://step-scientists.vercel.app
- **Features**: 
  - Google Fit integration for step tracking
  - Discovery Mode (earn cells to discover species)
  - Training Mode (earn XP to level up Steplings)
  - Fusion system (combine Steplings)
  - Lifetime Achievement system with bonuses
  - Magnifying glass tiers for better discoveries
  - XP banking system

### Mobile App (Development - NOT DEPLOYED)
- **Location**: `src/` folder
- **Technology**: React Native with TypeScript
- **Status**: In development, not yet deployed
- **Features**: Redux Toolkit, React Navigation, AsyncStorage

### Backend API (Production - DEPLOYED)
- **Technology**: Node.js with Express.js, TypeScript
- **Database**: PostgreSQL (Render.com managed)
- **Deployment**: Render.com
- **URL**: https://step-scientists-backend.onrender.com
- **Features**:
  - RESTful API endpoints
  - JWT authentication
  - Species discovery system
  - Stepling management (CRUD)
  - Fusion mechanics
  - Training roster management
  - Lifetime achievements tracking

## Features

- **Step Tracking**: Google Fit integration for real-world walking
- **Game Modes**: 
  - Discovery Mode: 1000 steps = 1 cell (with efficiency bonuses)
  - Training Mode: 10 steps = 1 XP (with efficiency bonuses)
- **Species Discovery**: Find unique Stepling species with rarity tiers
- **Fusion System**: Combine two Steplings of same species/fusion level
- **Training Roster**: Select up to 10-16 Steplings to receive XP (based on achievements)
- **Lifetime Achievements**: 12 named achievements + infinite progression
- **Magnifying Glass**: Uncommon, Rare, Epic, Legendary tiers for better discoveries
- **XP Banking**: Store excess XP when roster is full (cap increases with achievements)

## Deployment Architecture

### Production Environment

#### Backend (Render.com)
- **URL**: https://step-scientists-backend.onrender.com
- **Database**: PostgreSQL managed by Render
- **Deployment**: Automatic from `main` branch
- **Health Check**: `GET /health`

#### Web Frontend (Vercel)
- **URL**: https://step-scientists.vercel.app
- **Deployment**: Manual from `public/` folder
- **Command**: `cd public && vercel --prod`
- **Auto-detects**: Backend URL based on hostname (localhost vs production)

### Local Development Setup

#### Prerequisites
1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher) - for local backend development
3. **Git** for version control

#### Backend Local Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Configure database (if running locally)
# Edit .env with your PostgreSQL credentials:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=step_scientists
DB_USER=postgres
DB_PASSWORD=your_password

# 5. Run migrations (creates tables)
npm run migrate

# 6. Seed initial data (species)
npm run seed

# 7. Start development server
npm run dev
# Backend runs on http://localhost:3000
```

#### Web App Local Testing

```bash
# Option 1: Use a simple HTTP server
cd public
npx http-server -p 8080

# Option 2: Use Python
cd public
python -m http.server 8080

# Open browser to http://localhost:8080
```

#### Mobile App Development (Not Yet Deployed)

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (requires Android Studio)
npm run android

# Run on iOS (requires Xcode, macOS only)
npm run ios
```

## Project Structure

```
step-scientists/
├── public/                     # ✅ WEB APP (DEPLOYED TO VERCEL)
│   ├── index.html             # Main web app
│   ├── app.js                 # Game logic + Google Fit integration
│   ├── sw.js                  # Service worker for PWA
│   └── manifest.json          # PWA manifest
│
├── backend/                    # ✅ BACKEND API (DEPLOYED TO RENDER)
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   └── types/             # TypeScript types
│   ├── migrations/            # Database schema migrations
│   └── seeds/                 # Initial data (species)
│
├── src/                        # ⚠️ MOBILE APP (IN DEVELOPMENT)
│   ├── components/            # React Native components
│   ├── services/              # API and device services
│   ├── store/                 # Redux store and slices
│   └── types/                 # TypeScript type definitions
│
└── .kiro/specs/               # Feature specifications
```

## API Endpoints

### Health Check
- `GET /health` - Backend health status

### Species
- `GET /api/species/all` - Get all species
- `POST /api/species/discover` - Discover a new species (creates Stepling)

### Steplings
- `GET /api/steplings` - Get all player's Steplings
- `GET /api/steplings/:id` - Get specific Stepling
- `POST /api/steplings` - Create new Stepling
- `PUT /api/steplings/:id/levelup` - Level up a Stepling
- `POST /api/steplings/fuse` - Fuse two Steplings
- `DELETE /api/steplings/:id` - Release a Stepling

### Lifetime Achievements
- `GET /api/lifetime-achievements` - Get player's achievements
- `POST /api/lifetime-achievements/sync` - Sync achievement progress
- `GET /api/lifetime-achievements/calculate` - Calculate bonuses for step count

### Authentication (Planned)
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Login player
- `POST /api/auth/refresh` - Refresh access token

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

## Deployment Process

### Backend Deployment (Render.com)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "your changes"
   git push origin main
   ```

2. **Automatic Deployment**
   - Render automatically deploys from `main` branch
   - Runs migrations automatically
   - Backend available at: https://step-scientists-backend.onrender.com

3. **Manual Migration (if needed)**
   - Access Render dashboard
   - Open Shell for your service
   - Run: `npm run migrate`

### Web App Deployment (Vercel)

1. **Navigate to public folder**
   ```bash
   cd public
   ```

2. **Deploy to production**
   ```bash
   vercel --prod
   ```

3. **Verify deployment**
   - Web app available at: https://step-scientists.vercel.app
   - Check browser console for errors
   - Test backend connection (should show "✅ Connected")
   - Test Google Fit connection

### Mobile App Deployment (Future)

When ready for mobile deployment:

1. **Build Android APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Build iOS IPA** (macOS only)
   ```bash
   cd ios
   xcodebuild archive
   ```

3. **Distribute**
   - Google Play Store (Android)
   - Apple App Store (iOS)
   - Or use Firebase App Distribution for testing

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