# Documentation Assets

This folder contains media assets for documentation purposes only. These files are **NOT** included in the browser extension package.

## Folder Structure

### `/screenshots`

Place screenshots here showing the extension in action:

- `netflix-detail-page.png` - Widget on Netflix detail page
- `netflix-mini-modal.png` - Widget in Netflix hover preview
- `appletv-movie.png` - Widget on Apple TV+ movie page
- `appletv-series.png` - Widget on Apple TV+ TV series page
- etc.

**Recommended format:** PNG or JPEG, optimized/compressed

### `/videos`

Place demo videos here:

- `netflix-demo.mp4` / `netflix-demo.mov`
- `appletv-demo.mp4` / `appletv-demo.mov`
- etc.

**Note:** Large video files (>10MB) are excluded from Git via `.gitignore`. Consider converting to GIF for README embeds.

## Usage in README

Reference assets using relative paths:

```markdown
![Netflix Widget](docs/screenshots/netflix-detail-page.png)
![Demo](docs/videos/demo.gif)
```
