/**
 * Skysplitter Desktop - Bluesky API Client
 * Version: 1.0.2
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
        this.currentUser = null;
        this.sessionRestoreAttempted = false;
    }

    async checkSession() {
        if (this.sessionRestoreAttempted) {
            return this.isAuthenticated;
        }

        const credentials = sessionStorage.getItem('bluesky_credentials');
        if (credentials) {
            try {
                const { identifier, password } = JSON.parse(credentials);
                await this.agent.login({
                    identifier,
                    password
                });
                this.isAuthenticated = true;
                await this.fetchCurrentUser();
                return true;
            } catch (error) {
                console.warn('Session restore failed:', error);
                sessionStorage.removeItem('bluesky_credentials');
                this.isAuthenticated = false;
                this.currentUser = null;
                return false;
            } finally {
                this.sessionRestoreAttempted = true;
            }
        }
        this.sessionRestoreAttempted = true;
        return false;
    }

    async login(identifier, appPassword) {
        try {
            await this.agent.login({
                identifier,
                password: appPassword
            });
            
            this.isAuthenticated = true;
            await this.fetchCurrentUser();
            
            sessionStorage.setItem('bluesky_credentials', JSON.stringify({
                identifier,
                password: appPassword
            }));
            return true;
        } catch (error) {
            this.isAuthenticated = false;
            this.currentUser = null;
            
            if (error.status === 401) {
                throw new Error('Invalid username or password');
            } else if (error.status === 429) {
                throw new Error('Too many login attempts. Please try again later');
            } else {
                throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
            }
        }
    }

    async fetchCurrentUser() {
        if (!this.agent.session?.did) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await this.agent.getProfile({ actor: this.agent.session.did });
            this.currentUser = {
                handle: response.data.handle,
                displayName: response.data.displayName || response.data.handle,
                avatar: response.data.avatar,
                did: this.agent.session.did,
                description: response.data.description || '',
                followsCount: response.data.followsCount || 0,
                followersCount: response.data.followersCount || 0
            };
            return this.currentUser;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            throw new Error('Failed to fetch user profile. Please try logging in again.');
        }
    }

    async logout() {
        try {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.sessionRestoreAttempted = false;
            sessionStorage.removeItem('bluesky_credentials');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw new Error('Failed to logout properly');
        }
    }

    async createPost(text, links = [], reply = null) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            const post = {
                text,
                createdAt: new Date().toISOString(),
                langs: ['en']
            };

            // Process links and create facets
            if (links.length > 0) {
                const facets = await this.createFacets(text, links);
                if (facets.length > 0) {
                    post.facets = facets;
                }

                // Create embed for the first link
                try {
                    const embedData = await this.createEmbed(links[0]);
                    if (embedData) {
                        post.embed = embedData;
                    }
                } catch (embedError) {
                    console.warn('Failed to create embed:', embedError);
                }
            }

            // Add reply data if this is part of a thread
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
            console.error('Post creation failed:', error);
            throw new Error(error.message || 'Failed to create post');
        }
    }

    async createFacets(text, links) {
        const facets = [];
        const textEncoder = new TextEncoder();

        for (const link of links) {
            const startIndex = text.indexOf(link);
            if (startIndex === -1) continue;

            const byteStart = textEncoder.encode(text.slice(0, startIndex)).length;
            const byteEnd = byteStart + textEncoder.encode(link).length;

            facets.push({
                index: {
                    byteStart,
                    byteEnd
                },
                features: [{
                    $type: 'app.bsky.richtext.facet#link',
                    uri: link
                }]
            });
        }

        return facets;
    }

    async createEmbed(url) {
        if (!url) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.statusText}`);
            }

            const html = await response.text();
            
            const embedData = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: url,
                    title: this.extractMetaContent(html, 'title') || 
                           this.extractMetaContent(html, 'og:title') || 
                           'Untitled',
                    description: this.extractMetaContent(html, 'description') || 
                                this.extractMetaContent(html, 'og:description') || 
                                ''
                }
            };

            const imageUrl = this.extractMetaContent(html, 'og:image');
            if (imageUrl) {
                try {
                    const imageResponse = await fetch(imageUrl);
                    if (!imageResponse.ok) {
                        throw new Error('Failed to fetch image');
                    }
                    
                    const blob = await imageResponse.blob();
                    const upload = await this.agent.uploadBlob(blob, {
                        encoding: blob.type
                    });

                    embedData.external.thumb = upload.data.blob;
                } catch (imageError) {
                    console.warn('Failed to process thumbnail:', imageError);
                }
            }

            return embedData;
        } catch (error) {
            console.warn('Failed to create embed:', error);
            return null;
        }
    }

    extractMetaContent(html, name) {
        const metaMatch = html.match(
            new RegExp(`<meta[^>]*(?:name|property)=["'](?:${name})["'][^>]*content=["']([^"']+)["']`, 'i')
        ) || html.match(
            new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:${name})["']`, 'i')
        );
        if (name === 'title' && !metaMatch) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            return titleMatch ? titleMatch[1].trim() : null;
        }
        return metaMatch ? metaMatch[1].trim() : null;
    }
}

module.exports = BlueskyClient;