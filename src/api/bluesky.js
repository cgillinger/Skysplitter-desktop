/**
 * Skysplitter Desktop - Bluesky API Client
 * Version: 1.0.0
 * Author: Christian Gillinger
 * License: MIT
 */

const { BskyAgent } = require('@atproto/api');

class BlueskyClient {
    constructor() {
        this.agent = new BskyAgent({
            service: 'https://bsky.social'
        });
        this.isAuthenticated = false;
    }

    async checkSession() {
        const credentials = sessionStorage.getItem('bluesky_credentials');
        if (credentials) {
            try {
                const { identifier, password } = JSON.parse(credentials);
                await this.agent.login({
                    identifier,
                    password
                });
                this.isAuthenticated = true;
                return true;
            } catch (error) {
                sessionStorage.removeItem('bluesky_credentials');
                this.isAuthenticated = false;
                return false;
            }
        }
        return false;
    }

    async login(identifier, appPassword) {
        try {
            await this.agent.login({
                identifier,
                password: appPassword
            });
            
            this.isAuthenticated = true;
            sessionStorage.setItem('bluesky_credentials', JSON.stringify({
                identifier,
                password: appPassword
            }));
            return true;
        } catch (error) {
            this.isAuthenticated = false;
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async logout() {
        this.isAuthenticated = false;
        sessionStorage.removeItem('bluesky_credentials');
    }

    async createPost(text, embed = null, reply = null) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            const post = {
                text,
                createdAt: new Date().toISOString(),
                langs: ['en']
            };

            if (embed) {
                post.embed = await this.createEmbed(embed);
            }

            if (reply) {
                post.reply = {
                    root: reply.root || reply.post,
                    parent: reply.post
                };
            }

            const response = await this.agent.post(post);
            return {
                success: true,
                uri: response.uri,
                cid: response.cid
            };
        } catch (error) {
            throw new Error(`Post failed: ${error.message}`);
        }
    }

    async createEmbed(embed) {
        const embedData = {
            $type: 'app.bsky.embed.external',
            external: {
                uri: embed.url,
                title: embed.title,
                description: embed.description
            }
        };

        if (embed.thumb) {
            const response = await fetch(embed.thumb);
            const blob = await response.blob();
            const upload = await this.agent.uploadBlob(blob, {
                encoding: 'image/jpeg'
            });

            embedData.external.thumb = {
                $type: 'blob',
                ref: upload.data.blob,
                mimeType: 'image/jpeg',
                size: blob.size
            };
        }

        return embedData;
    }
}

module.exports = BlueskyClient;