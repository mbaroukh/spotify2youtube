import { argv } from "bun";

const client_id = process.env.spotify_client_id!;
const client_secret = process.env.spotify_client_secret!;
const redirect_uri = "http://localhost:5555/callback";
const scope =
  "user-read-email playlist-read-private playlist-read-collaborative";

const refresh_token = process.env.spotify_refresh_token!;

const cmd = argv[2];

const printLoginString = () => {
  console.log(
    `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
      scope
    )}&redirect_uri=${encodeURIComponent(redirect_uri)}`
  );
};

if (cmd === "login") {
  await printLoginString();
}

const printAccessToken = async (code: string) => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      code,
      redirect_uri,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  console.log(json);
};

if (cmd === "token") {
  await printAccessToken(process.argv[3]);
}

const refreshTokens = async () => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      client_id,
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  console.log(json);
};

if (cmd === "refresh") {
  await refreshTokens();
}
