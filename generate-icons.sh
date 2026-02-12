#!/bin/bash

# Icon Generator for Cauzify PWA
# This script creates simple placeholder icons using SVG

echo "Creating icons directory..."
mkdir -p icons

# Create SVG template
SVG_TEMPLATE='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 SIZE SIZE">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#818cf8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#38bdf8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="SIZE" height="SIZE" rx="RADIUS" fill="url(#grad)"/>
  <text x="CENTER" y="TEXTPOS" font-size="FONTSIZE" text-anchor="middle" fill="white" font-family="system-ui">🎵</text>
</svg>'

# Function to create SVG icon
create_icon() {
  local SIZE=$1
  local RADIUS=$((SIZE / 5))
  local CENTER=$((SIZE / 2))
  local TEXTPOS=$((SIZE * 7 / 10))
  local FONTSIZE=$((SIZE / 2))
  
  local SVG="${SVG_TEMPLATE//SIZE/$SIZE}"
  SVG="${SVG//RADIUS/$RADIUS}"
  SVG="${SVG//CENTER/$CENTER}"
  SVG="${SVG//TEXTPOS/$TEXTPOS}"
  SVG="${SVG//FONTSIZE/$FONTSIZE}"
  
  echo "$SVG" > "icons/icon-${SIZE}.svg"
  echo "Created icons/icon-${SIZE}.svg"
}

# Create SVG icons
echo "Generating SVG icons..."
create_icon 72
create_icon 96
create_icon 128
create_icon 144
create_icon 152
create_icon 192
create_icon 384
create_icon 512

echo ""
echo "✓ SVG icons created!"
echo ""
echo "To convert SVG to PNG, you can use:"
echo "1. Online tools: https://cloudconvert.com/svg-to-png"
echo "2. ImageMagick: convert icon-512.svg icon-512.png"
echo "3. Inkscape: inkscape -w 512 -h 512 icon-512.svg -o icon-512.png"
echo ""
echo "Or simply use the SVG files directly in your manifest.json"
