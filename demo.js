
import dotenv from 'dotenv';

//读取.env 中的配置
dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID || ''; // 请填入你的豆瓣 Cookie（仅用于个人备份）
const CLIENT_SECRET = process.env.CLIENT_SECRET || ''; // 默认示例，可覆盖

async function getToken(name, description){
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(name + ':' + description).toString('base64'))
        },
        body: new URLSearchParams({grant_type: 'client_credentials'}),
    });
    const data = await res.json();
    return data.access_token;
}

async function fetchWebApi(accessToken, endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
            Authorization: 'Bearer ' + accessToken,
        },
        // body:JSON.stringify(body)
    });
    return await res.json();
}

async function getTopTracks(token){
    return (await fetchWebApi(token, 'v1/users/qbjzp9x71fehr1diydh26cuqb/playlists?limit=50&offset=0', 'GET'));
}

async function main(){
    const token = await getToken(CLIENT_ID, CLIENT_SECRET);
    console.log('Access Token:', token);
    const topTracks = await getTopTracks(token);
    console.log(topTracks);
}

main()