@echo off
echo 🔧 Setting up Git for Step Scientists development...
echo.

echo Step 1: Configuring Git user...
git config --global user.name "Step Scientists Dev"
git config --global user.email "stepscientist.dev@gmail.com"

echo Step 2: Setting up helpful Git aliases...
git config --global alias.st "status"
git config --global alias.co "checkout"
git config --global alias.br "branch"
git config --global alias.cm "commit -m"
git config --global alias.pushup "push -u origin main"

echo Step 3: Initializing repository...
git init

echo Step 4: Creating .gitignore...
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo dist/ >> .gitignore
echo *.log >> .gitignore
echo .DS_Store >> .gitignore
echo Thumbs.db >> .gitignore

echo Step 5: Adding all files...
git add .

echo Step 6: Creating initial commit...
git commit -m "Initial Step Scientists game with backend and frontend"

echo.
echo ✅ Git setup complete!
echo.
echo Next steps:
echo 1. Create GitHub repository at github.com
echo 2. Run: git remote add origin https://github.com/stepscientist-dev/step-scientists.git
echo 3. Run: git push -u origin main
echo.
pause