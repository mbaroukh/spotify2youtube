import * as fs from "fs";

const access_token = process.env.youtube_access_token!;

type YoutubeResponse<T> = {
  nextPageToken?: string;
  items: T[];
};

const downloadItems = async <T>(url: string, token?: string): Promise<T[]> => {
  const res = await fetch(`${url}${token ? `&pageToken=${token}` : ""}`, {
    headers: {
      authorization: `Bearer ${access_token}`,
    },
  });
  if (res.status === 401) {
    throw new Error("Your token seems expired. Please refresh or regenerate.");
  }
  const json = (await res.json()) as YoutubeResponse<T>;
  const items = json.items;
  if (json.nextPageToken) {
    const next = await downloadItems<T>(url, json.nextPageToken);
    return [...items, ...next];
  }
  return items;
};

type YoutubePlaylist = {
  id: string;
  snippet: {
    title: string;
  };
};

const getPlayLists = async () => {
  return downloadItems<YoutubePlaylist>(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&part=status&part=id&part=contentDetails&mine=true`
  );
};

const getPlaylistItems = async (id: string) => {
  return downloadItems<{ title: string }>(
    `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${id}&part=snippet`
  );
};

const createPlayList = async (name: string) => {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet&part=status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          title: name,
          description: "Playlist importée de spotify",
        },
        status: {
          privacyStatus: "unlisted",
        },
      }),
    }
  );
  if (res.status !== 200) {
    if (res.status === 429) {
      // Retry in 2 seconds ?
    }
    throw new Error(
      `Error creating playlist : ${res.status} / ${res.statusText}`
    );
  }
  const json = await res.json();
  return json as YoutubePlaylist;
};

const existingPlaylists = await getPlayLists();
const tracks = fs
  .readFileSync("./tracks.csv")
  .toString()
  .split("\n")
  .filter((v) => v)
  .map((v) => {
    const s = v.split(";");
    return {
      playlist: s[0],
    };
  });
const playlists = [
  ...tracks.reduce((acc, cur) => {
    acc.add(cur.playlist);
    return acc;
  }, new Set<string>()),
];

for (const name of playlists) {
  const exists = existingPlaylists.find((p) => p.snippet.title === name);
  if (!exists) {
    console.log(`Create playlist "${name}"`);
    const np = await createPlayList(name);
    existingPlaylists.push(np);
  }
}
