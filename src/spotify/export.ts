import { Playlist, Track } from "@spotify/web-api-ts-sdk";

const access_token = process.env.spotify_access_token!;
const user_account = process.env.spotify_user_account;

type SpotifyResponse<T> = {
  next?: string;
  items: T[];
};

const downloadItems = async <T>(url: string): Promise<T[]> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  if (res.status === 401) {
    throw new Error("Your token seems expired. Please refresh or regenerate.");
  }
  const json = (await res.json()) as SpotifyResponse<T>;
  const items = json.items;
  if (json.next) {
    const next = await downloadItems<T>(json.next);
    return [...items, ...next];
  }
  return items;
};

const getPlayLists = async () => {
  return downloadItems<Playlist>(
    `https://api.spotify.com/v1/users/${user_account}/playlists`
  );
};

const getTracks = async (playlist: Playlist) => {
  return downloadItems<{ track: Track }>(playlist.tracks.href);
};

const csv = (s: string) => {
  if (!s) {
    return "";
  }
  if (s.indexOf(";") > 0) {
    s = s.replaceAll('"', '\\"');
    return `"${s}"`;
  }
  return s;
};

const playlists = await getPlayLists();
for (const playlist of playlists) {
  const tracks = await getTracks(playlist);
  tracks.forEach((t) => {
    console.log(
      `${csv(playlist.name)};${csv(t.track.album.artists[0].name)};${csv(
        t.track.album.name
      )};${csv(t.track.name)};${csv(t.track.external_ids?.isrc)}`
    );
  });
}
