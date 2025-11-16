# Extension Icons

This directory contains the extension icons for Redactly.

## Current Status
The `icon.svg` file is a placeholder icon. To use it:

1. Convert the SVG to PNG at different sizes:
   - 16x16 pixels (icon-16.png)
   - 48x48 pixels (icon-48.png)
   - 128x128 pixels (icon-128.png)

## Converting SVG to PNG

You can use various tools to convert:

### Option 1: Using ImageMagick (CLI)
```bash
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png
```

### Option 2: Using Inkscape (CLI)
```bash
inkscape icon.svg --export-filename=icon-16.png --export-width=16 --export-height=16
inkscape icon.svg --export-filename=icon-48.png --export-width=48 --export-height=48
inkscape icon.svg --export-filename=icon-128.png --export-width=128 --export-height=128
```

### Option 3: Online Tools
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

### Option 4: Design Tools
- Open in Figma, Sketch, or Adobe Illustrator
- Export at the required sizes

## Future
Replace with professionally designed icons before v1.0 release.
