# De Spotify à Youtube Music

Je vais passer de spotify à youtube music.  
Mais pas envie de perdre mes playlists.

Je vois plein de projets sur github qui permettent de faire ça, dans tous les langages.

Mais bon, je suis développeur donc autant faire le mien.  
Ca me permettra de voir comment fonctionnent leurs apis.

Donc ce repo permet :

1. d'exporter ses playlists spotify vers un csv
2. d'importer ce csv vers youtube.

## Avant de commencer

J'ai utilisé [bun](https://bun.sh/).  
Donc vous avez besoin d'une version installée sur votre poste.  
C'est la 1.0.19 au moment ou j'écris ces lignes.

Personnellement, pour installer bun, node, java, kubectl, terraform, yarn, pnpm, ... bref, tout, j'utilise [asdf](https://asdf-vm.com/). Avant j'utilisais nv, nvm, sdkman, ... mais c'est du passé. J'ai trouvé le bonheur avec asdf.  
Je vous recommande grandement cette méthode (du moins si vous n'êtes pas sous windows).

Pour cela:

1. Suivre la [doc d'asdf](https://asdf-vm.com/guide/getting-started.html). Ca prend moins de 30 secondes montre en main. Si vous arrivez à lancer la commande `asdf`, c'est gagné.
2. Installez le plugin bun : `asdf plugin add bun`
3. Installez bun : `asdf install bun latest`
4. Rendez cette version par défaut : `asdf global bun latest`

C'est tout. Normalement la commande `bun` fonctionne à présent. C'est magique. Pensez à l'utiliser la prochaine fois que vous aurez un outil à installer (et par pitié, supprimer ces node/java installés gloablement sur votre machine...)

Faites un chekout de ce repo et lancez `bun install`.

## Export depuis spotify

### Créer une app sur votre compte spotify

Crééez une app [sur le dashbord spotify](https://developer.spotify.com/dashboard/create)  
Pour simplifier l'utilisation de ces scripts, utilisez `http://localhost:5555/callback` comme `redirect_uri`.  
Créez un `.env` à la racine avec :

```ini
spotify_client_id=...identifiant de votre app...
spotify_client_secret=...secret de votre app...
spotify_user_account=...votre compte spotify...
```

Note: pas besoin de `dotenv` pour l'utiliser. `Bun` l'importe automatiquement. Pratique. (`nodejs` le fait aussi depuis la version [20.6.0](https://nodejs.org/en/blog/release/v20.6.0) mais avec une option ...).

Vous devez ajouter votre compte spotify comme utilisateur de cette app.  
Pour cela, sur votre [dashboard developpeur](https://developer.spotify.com/dashboard) cliquez sur l'app que vous venez de créer puis sur `settings` et enfin `user management`. Là, vous pouvez ajouter votre compte.

### Obtenez un access_token

Dans [login.ts](./src/spotify/login.ts) il y a 3 méthodes :

- `printLoginString()` qui permet d'obtenir l'url à appeler pour autoriser l'app à acèder à vos playlists
- `printAccessToken();` qui va générer un token
- `refreshTokens()` qui permet d'avoir un nouveau token mais ce ne sera pas utile, le premier durant 1 heure.

Pour l'utiliser, commencez par afficher l'url à appeler avec

```bash
$ bun ./src/spotify/login.ts login
https://accounts.spotify.com/authorize?response_type=code&client_id=<...>&scope=user-read-email%20playlist-read-private%20playlist-read-collaborative&redirect_uri=http%3A%2F%2Flocalhost%3A5555%2Fcallback`
```

Mettez l'url dans un navigateur, accordez l'accès puis vous aurez une erreur. Normal. Ce qui nous intéresse c'est le code dans l'url. Vous devez avoir dans l'url quelque chose comme `http://localhost:5555/callback?code=AQAQdNAeqAb_-j...`. Le code permet d'obtenir le token.  
Copiez tout ce qui est derrière `code=` et lancez la commande suivante :

```bash
$ bun ./src/spotify/login.ts token AQAQdNAeqAb_-j...MQ
{
  access_token: "BQDQhjwE8LL7xjMRflD0g9txs6D-...7oXeiK91T0VyUs57NHwZv4Ej_c-54Q90A",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: "AQBQlIE0co37Ssbih0aNvpRX0hQqKju7t8Qfp...iYoUG2KrwbUrwy0Hm44U",
  scope: "playlist-read-private playlist-read-collaborative user-read-email",
}
```

Si vous avez bien l'access_token, c'est parfait.  
Ajoutez le à votre `.env` ainsi :

```ini
spotify_access_token=BQAg0q72rrgBIycGq_eLcd9Aw3EVI92n7faVD...zZIJ-cvp8Hzg
spotify_refresh_token=AQAhz3-r_1mvfl0Ul2N...8PtzDeM90
```

(le refresh_token est facultatif).

### Exportez les playlists

Le projet import le SDK spotify mais juste afin de profiter du typage.  
On aurait aussi pu tout faire avec mais ça aurait été trop simple 🙂.

Pour faire l'export il suffit de lancer le script [export.ts](./src/spotify/export.ts) :

```
$ bun ./src/spotify/export.ts >playlists.csv
```

Après cela, le fichier playlists.csv doit contenir une ligne par piste.

Les colonnes importantes sont la première et la dernière :

- la première est le nom de la playlist.
- la dernière est le `isrc` : `International Standard Recording Code`. Il identifie chaque piste et nous permettra de faire le lien avec youtube.

Sur mon compte, sur les 1586 pistes, 6 n'avaient pas de isrc. Je n'ai pas creusé pourquoi. C'est sur le même album. Il y a peut-être moyen de faire un lien différemment, mais je peux remettre 6 pistes manuellement.

## Import sur youtube

Maintenant que vous avez un export avec vos pistes, on va pouvoir les importer sur votre compte youtube.

En tant que développeur, j'ai toujours haïs ce qui vient de Google.
Google cloud est infâme. Leurs apis sont infâmes. Leurs SDks sont infâmes.  
Et forcément, leurs produits le sont aussi en général.  
Je ne pense pas que les succès d'Android ou de Chromecast soient dues à leur qualités intrasèques.  
Seuls les chromebook s'en sortent plutôt pas mal.

En général ils ont plein d'apis périmées qu changent de nom tous les 4 matins.
Youtube Music ne fait pas exception. C'était google Play Music et c'est devenu Youtube Music.  
et ça mélange les données et fonctions de Youtube Viéo et de Youtube Music qui n'ont en fait de commun que le nom.

Bref, tout ça pour dire qu'on va devoir utiliser une de leurs apis et ça n'est jamais une partie de plaisir.

Ce qu'on doit faire : créer un projet, configurer l'athentification, activer les apis.  
Après seulement on pourra coder.

### Création d'un projet

Tout commence la [console cloud](https://console.cloud.google.com/).  
Une fois connecté vous pouvez, dans le header, aller sur la liste des projet et en créer un nouveau.  
Si vous l'appelez `musicimport` comme moi, vous pourrez utiliser les liens que je mettrais plus bas.  
Puis revenez sur la console et vérifiez que c'est bien le nouveau projet qui est actif. (toujours dans le header).  
Le projet met 20 ou 30 secondes à se créer donc on ne peut pas le sélectionner tout de suite.

Aller ensuite dans la section `api et services` puis `bibliothèque`. ([Lien direct](https://console.cloud.google.com/apis/library?project=musicimport)]
Recherchez `YouTube Data API v3` (Au 23/12/2023. Dans quelques jours ce sera peut-être la v12).  
Cliquez dessus et activez la avec le bouton `Activer`.

On va devoir aller ensuite dans 2 onglets : `Ecran d'authorisation OAuth` puis `Identifiants`.  
Le premier est obligatoire avant de pouvoir créer des identifiants dans le second.

#### Ecran d'authorisation

Dans la secion

Pour créer des identifiants, allez dans la section `Identifiants` et utilisez le bouton `Créer des identifiants` en haut.  
Choisissez ``
