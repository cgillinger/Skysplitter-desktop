/**
 * Skysplitter Desktop - Main Application Logic
 * Version: 1.0.2
 * Author: Christian Gillinger 
 * License: MIT
 */

const BlueskyClient = require('../api/bluesky.js');

const MAX_POST_LENGTH = 300;
const RATE_LIMIT_DELAY = 2000;

class SkySplitter {
    constructor() {
        this.client = new BlueskyClient();
        this.links = new Set();
        this.currentPosts = [];
        this.init();
    }

    async init() {
        try {
            const isAuthenticated = await this.client.checkSession();
            if (isAuthenticated) {
                this.showAppView();
            } else {
                this.showLoginView();
            }
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showLoginView();
        }
    }

    showAppView() {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('appView').classList.remove('hidden');
        this.updateUserInfo();
    }

    showLoginView() {
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('appView').classList.add('hidden');
    }

    async updateUserInfo() {
        if (!this.client.currentUser) return;

        let userInfoContainer = document.getElementById('userInfo');
        const textInputContainer = document.getElementById('textInput');
        
        if (!userInfoContainer && textInputContainer) {
            userInfoContainer = document.createElement('div');
            userInfoContainer.id = 'userInfo';
            textInputContainer.parentNode.insertBefore(userInfoContainer, textInputContainer);
        }
        
        if (userInfoContainer) {
            const avatarUrl = this.client.currentUser.avatar || '../../assets/bluesky.png';
            
            userInfoContainer.innerHTML = `
                <div class="profile-container">
                    <img 
                        src="${avatarUrl}" 
                        alt="Profile" 
                        class="profile-image"
                        onerror="this.src='../../assets/bluesky.png'"
                    >
                    <div class="profile-info">
                        <span class="display-name">${this.client.currentUser.displayName || this.client.currentUser.handle}</span>
                        <span class="handle">@${this.client.currentUser.handle}</span>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });

        const contentArea = document.getElementById('content');
        contentArea.addEventListener('input', () => {
            this.handleTextChange(contentArea.value);
        });

        document.getElementById('splitButton').addEventListener('click', () => {
            this.handleSplit();
        });

        document.getElementById('postButton').addEventListener('click', () => {
            this.handlePost();
        });

        // Create and add logout button
        const appView = document.getElementById('appView');
        if (appView) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'text-right mb-4';
            
            const logoutButton = document.createElement('button');
            logoutButton.textContent = 'Logout';
            logoutButton.className = 'bg-red-600 hover:bg-red-700';
            logoutButton.addEventListener('click', () => this.handleLogout());
            
            buttonContainer.appendChild(logoutButton);
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.parentNode.insertBefore(buttonContainer, textInput);
            }
        }
    }

    // Rest of the class methods remain unchanged
    async handleLogin(event) {
        const username = document.getElementById('username').value;
        const appPassword = document.getElementById('appPassword').value;

        try {
            if (!username || !appPassword) {
                throw new Error('Both username and app password are required');
            }
            await this.client.login(username, appPassword);
            this.showAppView();
            this.showNotification('Login successful!', 'success');
        } catch (error) {
            this.showNotification(`Login error: ${error.message}`, 'error');
        }
    }

    async handleLogout() {
        try {
            await this.client.logout();
            const userInfo = document.getElementById('userInfo');
            if (userInfo) userInfo.remove();
            this.showLoginView();
            this.showNotification('Logged out successfully', 'success');
        } catch (error) {
            this.showNotification(`Logout error: ${error.message}`, 'error');
        }
    }

    handleTextChange(text) {
        const links = this.detectLinks(text);
        this.updateLinkSection(links);
        this.updateCharCount(text);
        
        // Update links Set
        this.links.clear();
        links.forEach(link => this.links.add(link));
    }

    detectLinks(text) {
        const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
        return text.match(urlRegex) || [];
    }

    updateLinkSection(links) {
        const linkSection = document.getElementById('linkSection');
        const linkList = document.getElementById('linkList');

        if (links.length === 0) {
            linkSection.classList.add('hidden');
            return;
        }

        linkSection.classList.remove('hidden');
        linkList.innerHTML = '';

        for (const link of links) {
            if (!this.links.has(link)) {
                this.links.add(link);
            }
            const linkEl = this.createLinkElement(link);
            linkList.appendChild(linkEl);
        }
    }

    createLinkElement(link) {
        const div = document.createElement('div');
        div.className = 'link-item';
        
        const linkText = document.createElement('span');
        linkText.className = 'truncate flex-1 mr-4';
        linkText.textContent = link;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => this.removeLink(link);
        
        div.appendChild(linkText);
        div.appendChild(removeBtn);
        return div;
    }

    removeLink(link) {
        const contentArea = document.getElementById('content');
        contentArea.value = contentArea.value.replace(link, '');
        this.handleTextChange(contentArea.value);
    }

    updateCharCount(text) {
        const count = text.length;
        document.getElementById('charCount').textContent = `${count} characters`;
        document.getElementById('splitButton').disabled = count === 0;
    }

    handleSplit() {
        const text = document.getElementById('content').value;
        if (!text) return;

        this.currentPosts = this.splitText(text);
        this.showPreview(this.currentPosts);
    }

    splitText(text) {
        const words = text.split(' ');
        let posts = [];
        let currentPost = '';
        let currentLinks = new Set();
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLink = this.detectLinks(word).length > 0;
            const potentialPostNumber = posts.length + 1;
            const maxContinuationLength = ` (${potentialPostNumber}/?)`.length;
            
            if (currentPost.length + 1 + word.length + maxContinuationLength <= MAX_POST_LENGTH) {
                currentPost += (currentPost ? ' ' : '') + word;
                if (isLink) {
                    currentLinks.add(word);
                }
            } else {
                if (currentPost) {
                    posts.push({
                        text: currentPost,
                        links: Array.from(currentLinks)
                    });
                    currentPost = word;
                    currentLinks = new Set();
                    if (isLink) {
                        currentLinks.add(word);
                    }
                } else {
                    const availableLength = MAX_POST_LENGTH - maxContinuationLength;
                    posts.push({
                        text: word.substring(0, availableLength),
                        links: []
                    });
                    currentPost = word.substring(availableLength);
                    if (isLink) {
                        currentLinks.add(word);
                    }
                }
            }
        }
        
        if (currentPost) {
            posts.push({
                text: currentPost,
                links: Array.from(currentLinks)
            });
        }

        return posts.map((post, index) => ({
            ...post,
            text: posts.length > 1 ? `${post.text} (${index + 1}/${posts.length})` : post.text
        }));
    }

    showPreview(posts) {
        const previewArea = document.getElementById('previewArea');
        const postPreviews = document.getElementById('postPreviews');
        
        previewArea.classList.remove('hidden');
        postPreviews.innerHTML = '';

        posts.forEach((post, index) => {
            const preview = document.createElement('div');
            preview.className = 'preview-item';
            
            const linksHtml = post.links.length > 0 
                ? `<div class="text-sm text-blue-500 mt-2">${post.links.length} link(s) detected</div>` 
                : '';
            
            preview.innerHTML = `
                <div class="font-medium mb-2">Post ${index + 1} of ${posts.length}</div>
                <div class="mt-2 border-l-4 border-blue-500 pl-3">${post.text}</div>
                ${linksHtml}
                <div class="text-sm text-gray-500 mt-2">${post.text.length} characters</div>
            `;
            postPreviews.appendChild(preview);
        });
    }

    async handlePost() {
        if (!this.currentPosts.length) return;

        try {
            let rootPost = null;
            let parentPost = null;

            for (let i = 0; i < this.currentPosts.length; i++) {
                const post = this.currentPosts[i];
                let reply = null;
                if (rootPost) {
                    reply = {
                        root: rootPost,
                        post: parentPost
                    };
                }

                const response = await this.client.createPost(post.text, post.links, reply);

                if (i === 0) {
                    rootPost = {
                        uri: response.uri,
                        cid: response.cid
                    };
                }
                
                parentPost = {
                    uri: response.uri,
                    cid: response.cid
                };

                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                this.updateProgress(i + 1, this.currentPosts.length);
            }
            
            this.showNotification('All posts created successfully!', 'success');
            
            document.getElementById('content').value = '';
            document.getElementById('previewArea').classList.add('hidden');
            this.currentPosts = [];
            this.updateCharCount('');
            this.links.clear();
            
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    updateProgress(current, total) {
        let progress = document.getElementById('postProgress');
        if (!progress) {
            progress = document.createElement('div');
            progress.id = 'postProgress';
            progress.className = 'text-sm text-gray-600 mt-2 text-center';
            document.getElementById('previewArea').appendChild(progress);
        }
        progress.textContent = `Posted ${current} of ${total}`;
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new SkySplitter();
});