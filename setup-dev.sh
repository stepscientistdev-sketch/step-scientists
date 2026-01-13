#!/bin/bash

echo "🚀 Setting up Step Monsters development environment..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   - Windows: Download from https://www.postgresql.org/download/windows/"
    echo "   - macOS: brew install postgresql"
    echo "   - Linux: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from https://nodejs.org/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL service first."
    echo "   - Windows: Start PostgreSQL service from Services"
    echo "   - macOS: brew services start postgresql"
    echo "   - Linux: sudo systemctl start postgresql"
    echo ""
    echo "📝 After starting PostgreSQL, run this script again."
    exit 1
fi

# Create database
echo "📊 Setting up database..."
createdb step_monsters 2>/dev/null || echo "Database 'step_monsters' already exists"

# Setup backend
echo "🔧 Setting up backend..."
cd backend

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file. Please update database credentials if needed."
fi

# Install dependencies
npm install

# Run migrations
echo "🗄️ Running database migrations..."
npx knex migrate:latest

# Run seeds
echo "🌱 Seeding database..."
npx knex seed:run

# Build backend
echo "🔨 Building backend..."
npm run build

cd ..

# Setup mobile app
echo "📱 Setting up mobile app..."
npm install

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 To start development:"
echo "   1. Start the backend: cd backend && npm run dev"
echo "   2. Start the mobile app: npm start"
echo "   3. Run on Android: npm run android"
echo "   4. Run on iOS: npm run ios"
echo ""
echo "📝 Don't forget to:"
echo "   - Update backend/.env with your database credentials"
echo "   - Set up Android SDK for React Native development"
echo "   - Set up Xcode for iOS development (macOS only)"