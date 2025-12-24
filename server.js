// server.js
import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import querystring from 'querystring';
import path from "path";
import {fileURLToPath} from "url";
import cookieParser from 'cookie-parser';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// Cookie 读写助手
const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
};

const getAuth = (req) => ({
    authCode: req.cookies?.authCode || null,
    authCodeExpiresAt: Number(req.cookies?.authCodeExpiresAt || 0),
    accessToken: req.cookies?.accessToken || null,
    refreshToken: req.cookies?.refreshToken || null,
    tokenExpiresAt: Number(req.cookies?.tokenExpiresAt || 0)
});

const setAuthCookies = (res, auth) => {
    res.cookie('authCode', auth.authCode || '', { ...cookieOpts, maxAge: 60 * 60 * 1000 });
    res.cookie('authCodeExpiresAt', auth.authCodeExpiresAt || 0, { ...cookieOpts, maxAge: 60 * 60 * 1000 });
    res.cookie('accessToken', auth.accessToken || '', { ...cookieOpts, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', auth.refreshToken || '', { ...cookieOpts, maxAge: 60 * 60 * 60 * 1000 });
    res.cookie('tokenExpiresAt', auth.tokenExpiresAt || 0, { ...cookieOpts, maxAge: 60 * 60 * 1000 });
};

const clearAuthCookies = (res) => {
    ['authCode', 'authCodeExpiresAt', 'accessToken', 'refreshToken', 'tokenExpiresAt']
        .forEach(k => res.clearCookie(k, cookieOpts));
};

const isCodeValid = (req) => {
    const { authCode, authCodeExpiresAt } = getAuth(req);
    return authCode && Date.now() < authCodeExpiresAt;
};

const isTokenValid = (req) => {
    const { accessToken, tokenExpiresAt } = getAuth(req);
    return accessToken && Date.now() < tokenExpiresAt;
};

app.get('/login', (req, res) => {
    const scope = 'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';
    const params = querystring.stringify({
        response_type: 'code',
        client_id: clientId,
        scope,
        redirect_uri: redirectUri
    });
    return res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('缺少授权码');
    try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            },
            body: querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            })
        });
        if (!tokenRes.ok) return res.status(tokenRes.status).send(tokenRes);
        const tokens = await tokenRes.json();
        const auth = {
            authCode: code,
            authCodeExpiresAt: Date.now() + 10 * 60 * 1000,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
        };
        setAuthCookies(res, auth);
        res.redirect('/');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 可选：刷新 access_token
async function refreshAccessToken(req, res) {
    const auth = getAuth(req);
    if (!auth.refreshToken) return null;
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: auth.refreshToken
        })
    });
    if (!tokenRes.ok) return null;
    const tokens = await tokenRes.json();
    const nextAuth = {
        ...auth,
        accessToken: tokens.access_token,
        tokenExpiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
    };
    setAuthCookies(res, nextAuth);
    return nextAuth;
}

app.get('/authState', (req, res) => {
    res.json({ codeValid: isCodeValid(req) });
});

// 主页：显示播放列表
app.get('/playerList', async (req, res) => {
    let auth = getAuth(req);
    if (!isCodeValid(req)) return res.redirect('/login');
    if (!isTokenValid(req)) {
        const refreshed = await refreshAccessToken(req, res);
        if (!refreshed) return res.redirect('/login');
        auth = refreshed;
    }
    try {
        let allPlaylists = [];
        let url = 'https://api.spotify.com/v1/me/playlists?limit=50';

        while (url) {
            const playlistsRes = await fetch(url, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });

            if (!playlistsRes.ok) {
                // 如果是第一页就失败，直接返回错误
                if (allPlaylists.length === 0) {
                    return res.status(playlistsRes.status).send('获取列表失败');
                }
                // 如果中间页失败，返回已获取的部分
                break;
            }

            const data = await playlistsRes.json();
            if (data.items) {
                allPlaylists = allPlaylists.concat(data.items);
            }
            url = data.next;
        }

        return res.json({ items: allPlaylists });
    } catch (err) {
        return res.status(500).send(err.message);
    }
});

async function fetchAllTracksByPlaylist(playlistId, accessToken) {
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    const ids = [];
    while (url) {
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!resp.ok) throw new Error(`获取歌单 ${playlistId} 失败`);
        const data = await resp.json();
        (data.items || []).forEach((it) => {
            const tid = it.track && it.track.id;
            if (tid) ids.push(tid);
        });
        url = data.next;
    }
    return ids;
}

app.post('/playlistTracks', async (req, res) => {
    let auth = getAuth(req);
    if (!isCodeValid(req)) return res.status(401).send('未授权');
    if (!isTokenValid(req)) {
        const refreshed = await refreshAccessToken(req, res);
        if (!refreshed) return res.status(401).send('未授权');
        auth = refreshed;
    }
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('缺少歌单ID');
    try {
        const all = [];
        for (const pid of ids) {
            const tracks = await fetchAllTracksByPlaylist(pid, auth.accessToken);
            all.push(...tracks);
        }
        const unique = Array.from(new Set(all));
        res.json({ trackIds: unique });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/createPlaylist', async (req, res) => {
    let auth = getAuth(req);
    if (!isCodeValid(req)) return res.status(401).send('未授权');
    if (!isTokenValid(req)) {
        const refreshed = await refreshAccessToken(req, res);
        if (!refreshed) return res.status(401).send('未授权');
        auth = refreshed;
    }

    const { trackIds } = req.body;
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
        return res.status(400).send('没有歌曲ID');
    }

    try {
        // 1. 获取用户信息
        const userRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${auth.accessToken}` }
        });
        if (!userRes.ok) throw new Error('获取用户信息失败');
        const user = await userRes.json();

        // 2. 创建歌单
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const createRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `spoinder ${dateStr}`,
                description: 'Created by Spoinder',
                public: true
            })
        });
        if (!createRes.ok) throw new Error('创建歌单失败');
        const playlist = await createRes.json();

        // 3. 添加歌曲 (Spotify API limit 100 per request)
        const uris = trackIds.map(id => `spotify:track:${id}`);
        // 简单处理，假设不超过100首，或者分批处理
        for (let i = 0; i < uris.length; i += 100) {
            const chunk = uris.slice(i, i + 100);
            const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: chunk })
            });
            if (!addRes.ok) throw new Error('添加歌曲失败');
        }

        res.json({ success: true, playlistId: playlist.id });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

app.post('/shufflePlaylists', async (req, res) => {
    let auth = getAuth(req);
    if (!isCodeValid(req)) return res.status(401).send('未授权');
    if (!isTokenValid(req)) {
        const refreshed = await refreshAccessToken(req, res);
        if (!refreshed) return res.status(401).send('未授权');
        auth = refreshed;
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).send('没有选择歌单');
    }

    try {
        for (const playlistId of ids) {
            // 1. 获取歌单所有歌曲
            const trackIds = await fetchAllTracksByPlaylist(playlistId, auth.accessToken);
            if (trackIds.length === 0) continue;

            // 2. 随机打乱 (尝试减少不动点，使结果与原顺序差异更大)
            const originalIds = [...trackIds];
            let attempts = 0;
            // 只要有过多不动点且尝试次数未耗尽，就重试
            while (attempts < 5) {
                // Fisher-Yates Shuffle
                for (let i = trackIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [trackIds[i], trackIds[j]] = [trackIds[j], trackIds[i]];
                }

                // 检查不动点数量
                let fixedPoints = 0;
                for (let k = 0; k < trackIds.length; k++) {
                    if (trackIds[k] === originalIds[k]) fixedPoints++;
                }

                // 如果不动点很少（例如少于5%），则满意退出
                if (fixedPoints <= Math.ceil(trackIds.length * 0.05)) break;
                attempts++;
            }
            //打印最终不动点数量和新旧列表的长度
            let finalFixedPoints = 0;
            for (let k = 0; k < trackIds.length; k++) {
                if (trackIds[k] === originalIds[k]) finalFixedPoints++;
            }
            console.log(`Playlist ${playlistId} shuffled with ${finalFixedPoints} fixed points after ${attempts} attempts.`);
            console.log(`Original length: ${originalIds.length}, Shuffled length: ${trackIds.length}`);

            // 3. 替换歌单内容 (Spotify Replace Playlist Items API)
            // 注意：一次最多替换100首，如果超过100首，需要先替换前100首，再添加剩下的
            const uris = trackIds.map(id => `spotify:track:${id}`);

            // 第一步：用前100首覆盖原歌单
            const firstChunk = uris.slice(0, 100);
            const replaceRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: firstChunk })
            });

            if (!replaceRes.ok) {
                throw new Error(`Replace tracks failed: ${replaceRes.status}`);
            }

            // 第二步：追加剩余的歌曲
            for (let i = 100; i < uris.length; i += 100) {
                const chunk = uris.slice(i, i + 100);
                const appendRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${auth.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ uris: chunk })
                });

                if (!appendRes.ok) {
                    throw new Error(`Append tracks failed: ${appendRes.status}`);
                }
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

app.get('/tracks', async (req, res) => {
    let auth = getAuth(req);
    const ids = (req.query.ids || '').toString();
    if (!ids) return res.status(400).send('缺少ID');
    if (!isCodeValid(req)) return res.status(401).send('未授权');
    if (!isTokenValid(req)) {
        const refreshed = await refreshAccessToken(req, res);
        if (!refreshed) return res.status(401).send('未授权');
        auth = refreshed;
    }
    try {
        const resp = await fetch(`https://api.spotify.com/v1/tracks?ids=${encodeURIComponent(ids)}`, {
            headers: { Authorization: `Bearer ${auth.accessToken}` }
        });
        if (!resp.ok) return res.status(resp.status).send('获取歌曲失败');
        const data = await resp.json();
        res.json({ items: data.tracks || [] });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/logout', (req, res) => {
    clearAuthCookies(res);
    res.json({ ok: true });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置静态文件服务
// 将 pages 文件夹作为根目录服务 html 文件
app.use(express.static(path.join(__dirname, 'pages')));
// 显式服务样式和脚本文件夹
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

app.listen(port, () => console.log(`Server on http://localhost:${port}`));
