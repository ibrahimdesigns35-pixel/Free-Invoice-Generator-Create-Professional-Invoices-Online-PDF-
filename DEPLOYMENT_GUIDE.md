# Deployment Guide

**IMPORTANT:** Git is not currently installed or recognized in your terminal.
Please install Git from [git-scm.com](https://git-scm.com/downloads) and restart your terminal before running these commands.

## Step 1: Initialize Git
Open your terminal (PowerShell or Command Prompt) inside the `invoice-generator` folder and run:

```powershell
git init
git add .
git commit -m "Initial commit"
```

## Step 2: Create GitHub Repository
1. Go to [GitHub.com](https://github.com/new).
2. **Repository Name:** `invoice-generator`
3. **Description:** Free Invoice Generator
4. **Visibility:** Public
5. **IMPORTANT:** Do **NOT** check "Add a README", "Add .gitignore", or "Choose a license". (Keep the repository empty).
6. Click **Create repository**.

## Step 3: Push Code
Run these commands in your terminal (replace `ibrahimdesigns35-pixel` with your actual username if different, but based on your request):

```powershell
git branch -M main
git remote add origin https://github.com/ibrahimdesigns35-pixel/invoice-generator.git
git push -u origin main
```

*(If you get an error that the remote exists, run this instead:)*
```powershell
git remote set-url origin https://github.com/ibrahimdesigns35-pixel/invoice-generator.git
git push -u origin main
```

## Step 4: Enable GitHub Pages
1. Go to your new repository on GitHub.
2. Click **Settings** (top right tab).
3. Click **Pages** (left sidebar).
4. Under **Build and deployment > Source**, select **Deploy from a branch**.
5. Under **Branch**, select **main** and folder **/(root)**.
6. Click **Save**.

## Live URL
Your site will be live at:
**https://ibrahimdesigns35-pixel.github.io/invoice-generator/**
