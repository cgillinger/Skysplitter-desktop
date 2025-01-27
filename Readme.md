# Skysplitter Desktop

Skysplitter is a desktop application that helps you split long texts into multiple posts for Bluesky social network. It automatically handles thread creation and maintains continuity between posts.

<div align="center">
  <img src="screenshots/screenshot.png" alt="Main Interface" width="800"/>
  <p><em>Main interface of Skysplitter Desktop</em></p>
  
  <img src="screenshots/screenshot1.png" alt="Text Splitting Preview" width="800"/>
  <p><em>Preview of text splitting functionality</em></p>
  
  <img src="screenshots/screenshot2.png" alt="Dark Mode Interface" width="800"/>
  <p><em>And when you are happy you just press "Post thread"</em></p>
</div>

## Features

- Split long text into multiple posts automatically
- Maintain thread continuity
- Automatic post numbering (e.g., 1/5, 2/5, etc.)
- Character count visualization
- Link detection and management
- Dark mode support
- Portable application - no installation required

## Quick Start

### Option 1: Using Pre-built Executable
1. Download `Skysplitter-1.0.1.exe` from the `releases` folder
2. Double-click to run the application
3. No installation needed!

### Option 2: Building from Source

#### Prerequisites
- Node.js (version 14 or higher)
- npm (usually comes with Node.js)
- Git (optional, for cloning)

#### Build Steps
1. Clone or download this repository
2. Open a terminal in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the application:
   ```bash
   npm run build
   ```
5. Find the executable in the `dist` folder

## Usage

1. Launch Skysplitter
2. Login with your Bluesky credentials
   - For security, use an App Password instead of your main password
   - Generate an App Password at [Bluesky App Passwords](https://bsky.app/settings/app-passwords)
3. Enter or paste your long text
4. Click "Split" to preview how the text will be divided
5. Click "Post Thread" to publish your posts

## Security Note

Never use your main Bluesky password! Always use an App Password:
1. Go to [Bluesky App Passwords](https://bsky.app/settings/app-passwords)
2. Create a new App Password
3. Use that password to log in to Skysplitter
4. Delete the App Password when you're done using Skysplitter

## Development

The application is built using:
- Electron
- @atproto/api for Bluesky integration
- TailwindCSS for styling

Project structure:
```
skysplitter-desktop/
├── assets/
│   └── bluesky.ico
├── src/
│   ├── api/
│   │   └── bluesky.js
│   └── client/
│       ├── app.js
│       ├── index.html
│       └── styles.css
├── main.js
└── package.json
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Version History

Current version: 1.0.1

### Changelog
- v1.0.1 - Minor updates and improvements
- v1.0.0 - Initial release

## Author

Christian Gillinger

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.