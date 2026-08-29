# Tauri Icons

This directory should contain the application icons for different platforms:

## Required Icons:

- `32x32.png` - Small icon for Linux
- `128x128.png` - Medium icon for Linux  
- `icon.icns` - macOS icon format
- `icon.ico` - Windows icon format

## Icon Creation:

You can create these icons using:
- **macOS**: Use IconKit or online converters to create .icns from PNG
- **Windows**: Use tools like GIMP or online converters to create .ico from PNG
- **Linux**: PNG files at the specified sizes

## Temporary Solution:

For development, you can:
1. Use a simple PNG as a placeholder
2. Convert it to the required formats
3. Place them in this directory

## Note:

The Tauri build will fail if these icons are missing. For now, you can comment out the icon section in `tauri.conf.json` if you don't have icons ready.