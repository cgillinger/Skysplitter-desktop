/**
 * Skysplitter Desktop - Main Application Logic
 * Version: 1.0.0
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
        this.embeds = new Map();
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
    }

    showLoginView() {
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('appView').classList.add('hidden');
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

        if (!document.getElementById('logoutButton')) {
            const logoutButton = document.createElement('button');
            logoutButton.id = 'logoutButton';
            logoutButton.textContent = 'Logout';
            logoutButton.className = 'bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 absolute top-4 right-4';
            logoutButton.addEventListener('click', () => this.handleLogout());
            document.getElementById('appView').appendChild(logoutButton);
        }
    }

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
    }

    detectLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
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
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const potentialPostNumber = posts.length + 1;
            const maxContinuationLength = ` (${potentialPostNumber}/?)`.length;
            
            if (currentPost.length + 1 + word.length + maxContinuationLength <= MAX_POST_LENGTH) {
                currentPost += (currentPost ? ' ' : '') + word;
            } else {
                if (currentPost) {
                    posts.push(currentPost);
                    currentPost = word;
                } else {
                    const availableLength = MAX_POST_LENGTH - maxContinuationLength;
                    posts.push(word.substring(0, availableLength));
                    currentPost = word.substring(availableLength);
                }
            }
        }
        
        if (currentPost) {
            posts.push(currentPost);
        }

        return posts.map((post, index) => {
            if (posts.length > 1) {
                return `${post} (${index + 1}/${posts.length})`;
            }
            return post;
        });
    }

    showPreview(posts) {
        const previewArea = document.getElementById('previewArea');
        const postPreviews = document.getElementById('postPreviews');
        
        previewArea.classList.remove('hidden');
        postPreviews.innerHTML = '';

        posts.forEach((post, index) => {
            const preview = document.createElement('div');
            preview.className = 'preview-item';
            preview.innerHTML = `
                <div class="font-medium mb-2">Post ${index + 1} of ${posts.length}</div>
                <div class="mt-2 border-l-4 border-blue-500 pl-3">${post}</div>
                <div class="text-sm text-gray-500 mt-2">${post.length} characters</div>
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

                const response = await this.client.createPost(post, null, reply);

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

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SkySplitter();
});