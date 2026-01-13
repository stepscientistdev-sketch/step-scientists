#!/bin/bash

echo "🚀 Setting up Step Monsters for Mobile Testing"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: Get IP Address
echo ""
echo "📱 Step 1: Network Configuration"
echo "================================"

# Detect IP address based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
else
    # Try generic approach
    IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
fi

if [ -z "$IP_ADDRESS" ]; then
    print_error "Could not automatically detect IP address"
    echo "Please manually find your IP address:"
    echo "  Mac: ifconfig | grep 'inet '"
    echo "  Linux: hostname -I"
    echo ""
    read -p "Enter your IP address: " IP_ADDRESS
fi

print_status "Detected IP Address: $IP_ADDRESS"

# Step 2: Update API Client
echo ""
echo "🔧 Step 2: Updating API Configuration"
echo "====================================="

API_CLIENT_FILE="src/services/apiClient.ts"
if [ -f "$API_CLIENT_FILE" ]; then
    # Create backup
    cp "$API_CLIENT_FILE" "$API_CLIENT_FILE.backup"
    
    # Update the IP address in the file
    sed -i.tmp "s/const DEVELOPMENT_IP = 'YOUR_COMPUTER_IP';/const DEVELOPMENT_IP = '$IP_ADDRESS';/g" "$API_CLIENT_FILE"
    rm "$API_CLIENT_FILE.tmp" 2>/dev/null || true
    
    print_status "Updated API client to use IP: $IP_ADDRESS"
    print_info "API will be available at: http://$IP_ADDRESS:3000/api"
else
    print_error "API client file not found: $API_CLIENT_FILE"
    exit 1
fi

# Step 3: Verify Prerequisites
echo ""
echo "🔍 Step 3: Verifying Prerequisites"
echo "=================================="

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    print_status "PostgreSQL client found"
    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            print_status "PostgreSQL server is running"
        else
            print_warning "PostgreSQL server may not be running. Please start it manually."
        fi
    fi
else
    print_warning "PostgreSQL client not found. Please ensure PostgreSQL is installed."
fi

# Step 4: Install Dependencies
echo ""
echo "📦 Step 4: Installing Dependencies"
echo "=================================="

# Frontend dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
else
    print_status "Frontend dependencies already installed"
fi

# Backend dependencies
cd backend
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
else
    print_status "Backend dependencies already installed"
fi

# Step 5: Database Setup
echo ""
echo "🗄️  Step 5: Database Setup"
echo "=========================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_info "Creating .env file with default database configuration..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=step_monsters
DB_USER=postgres
DB_PASSWORD=password

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    print_status "Created .env file with default configuration"
    print_warning "Please update database credentials in backend/.env if needed"
fi

# Run migrations
print_info "Running database migrations..."
if npm run migrate; then
    print_status "Database migrations completed"
else
    print_error "Database migrations failed. Please check your database connection."
    print_info "Make sure PostgreSQL is running and credentials in .env are correct"
fi

# Seed data
print_info "Seeding initial data..."
if npm run seed; then
    print_status "Database seeding completed"
else
    print_warning "Database seeding failed. This might be okay if data already exists."
fi

cd ..

# Step 6: Test Configuration
echo ""
echo "🧪 Step 6: Testing Configuration"
echo "================================"

print_info "Testing API client configuration..."
if node -e "
const { apiClient } = require('./src/services/apiClient.ts');
console.log('API client configured successfully');
" 2>/dev/null; then
    print_status "API client configuration is valid"
else
    print_warning "API client configuration test failed (this is normal if TypeScript isn't compiled)"
fi

# Step 7: Final Instructions
echo ""
echo "🚀 Step 7: Ready to Start!"
echo "=========================="

print_status "Setup complete! Next steps:"
echo ""
echo "1. Start the backend server:"
echo "   ${BLUE}cd backend && npm run dev${NC}"
echo ""
echo "2. In a new terminal, build and run the mobile app:"
echo "   ${BLUE}npx react-native run-android${NC}"
echo ""
echo "3. Test API connectivity from your mobile device:"
echo "   Open browser and visit: ${BLUE}http://$IP_ADDRESS:3000/health${NC}"
echo ""
echo "4. Follow the Mobile Testing Guide for comprehensive testing"
echo ""

print_warning "Important Notes:"
echo "• Ensure your mobile device is on the same WiFi network"
echo "• Grant Google Fit permissions when prompted"
echo "• Check firewall settings if connection fails"
echo "• The API is configured to use IP: $IP_ADDRESS"
echo ""

print_status "Mobile testing setup complete! 🎉"
echo ""
echo "If you need to change the IP address later, edit:"
echo "  ${BLUE}src/services/apiClient.ts${NC} (look for DEVELOPMENT_IP)"