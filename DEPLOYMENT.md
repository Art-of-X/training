# Deployment Guide: GitHub Pages

This guide explains how to deploy the Artificial Artistic Thinking questionnaire to GitHub Pages.

## Prerequisites

1. A GitHub repository containing this project
2. Node.js and npm installed locally
3. GitHub Pages enabled in your repository settings

## Automatic Deployment (Recommended)

The project is configured with GitHub Actions for automatic deployment:

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **GitHub Actions**
4. Save the settings

### 2. Configure Repository Name

Update the base path in `vite.config.js` and homepage in `package.json`:

```javascript
// vite.config.js
export default defineConfig({
  base: '/your-repository-name/', // Replace with your actual repo name
  // ...
})
```

```json
// package.json
{
  "homepage": "https://your-username.github.io/your-repository-name",
  // ...
}
```

### 3. Push to Main Branch

Once you push to the `main` branch, GitHub Actions will:
- Install dependencies
- Build the project
- Deploy to GitHub Pages
- Make it available at `https://your-username.github.io/your-repository-name`

## Manual Deployment

If you prefer manual deployment:

### 1. Build the project
```bash
npm run build
```

### 2. Deploy to gh-pages branch
```bash
npm run deploy
```

This will:
- Build the project
- Create/update the `gh-pages` branch
- Deploy the built files

### 3. Configure GitHub Pages (if not done)
- Go to repository Settings → Pages
- Set source to "Deploy from a branch"
- Select `gh-pages` branch and `/ (root)` folder

## Project Structure

```
training/
├── .github/workflows/deploy.yml    # GitHub Actions workflow
├── src/                           # Source code
├── dist/                          # Build output (auto-generated)
├── vite.config.js                # Vite configuration
├── package.json                  # Dependencies and scripts
└── DEPLOYMENT.md                 # This file
```

## Environment Configuration

The application supports both English and German languages and includes:

- **Logical Reasoning Questions**: Translated bat/ball, machines, lily pads problems
- **Experimental Questions**: Audio responses on sustainability, diversity, defense industry  
- **Artistic Practice Questions**: German audio questions on creative processes
- **MFQ Questionnaire**: Moral Foundations Questionnaire with bilingual support

## Troubleshooting

### Build Fails
- Check that all dependencies are installed: `npm install`
- Verify Node.js version (18+ recommended)
- Check for syntax errors in JSON files

### Deployment Fails
- Ensure GitHub Actions has necessary permissions
- Check if the base path in `vite.config.js` matches your repository name
- Verify that GitHub Pages is enabled in repository settings

### App Not Loading
- Check browser console for 404 errors
- Verify the base path configuration
- Ensure all assets are loading from the correct path

## Live Demo

Once deployed, the questionnaire will be available at:
`https://your-username.github.io/your-repository-name`

## Features

✅ **Bilingual Support**: Full English/German translation  
✅ **Audio Recording**: Voice responses with playback  
✅ **Progress Tracking**: Visual progress indicators  
✅ **Data Export**: CSV export functionality  
✅ **Mobile Responsive**: Works on all devices  
✅ **Session Management**: Preserves progress  
✅ **Academic Standards**: Ethics compliance and data protection 